package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.RegistrationRequest;
import com.micesign.domain.User;
import com.micesign.domain.enums.RegistrationStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.registration.*;
import com.micesign.mapper.RegistrationMapper;
import com.micesign.repository.DepartmentRepository;
import com.micesign.repository.PositionRepository;
import com.micesign.repository.RegistrationRequestRepository;
import com.micesign.repository.UserRepository;
import com.micesign.security.CustomUserDetails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class RegistrationService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationService.class);

    private final RegistrationRequestRepository registrationRequestRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationMapper registrationMapper;
    private final AuditLogService auditLogService;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;

    public RegistrationService(RegistrationRequestRepository registrationRequestRepository,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                RegistrationMapper registrationMapper,
                                AuditLogService auditLogService,
                                DepartmentRepository departmentRepository,
                                PositionRepository positionRepository) {
        this.registrationRequestRepository = registrationRequestRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.registrationMapper = registrationMapper;
        this.auditLogService = auditLogService;
        this.departmentRepository = departmentRepository;
        this.positionRepository = positionRepository;
    }

    @Transactional
    public RegistrationStatusResponse submit(RegistrationSubmitRequest request) {
        // Check if email already exists in user table
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new BusinessException("REG_DUPLICATE_EMAIL", "이미 등록된 이메일입니다.");
        }

        // Check if PENDING request exists for same email with pessimistic lock (prevents race condition)
        if (registrationRequestRepository.findByEmailAndStatusForUpdate(request.email(), RegistrationStatus.PENDING).isPresent()) {
            throw new BusinessException("REG_DUPLICATE_PENDING", "이미 대기 중인 신청이 있습니다.");
        }

        // Create registration request with hashed password
        RegistrationRequest entity = new RegistrationRequest();
        entity.setName(request.name());
        entity.setEmail(request.email());
        entity.setPasswordHash(passwordEncoder.encode(request.password()));

        entity = registrationRequestRepository.save(entity);

        // Audit log with null userId (unauthenticated user)
        auditLogService.log(null, "REGISTRATION_SUBMITTED", "REGISTRATION_REQUEST",
                entity.getId(), Map.of("email", request.email()));

        return registrationMapper.toStatusResponse(entity);
    }

    public RegistrationStatusResponse getStatusByEmailAndToken(String email, String trackingToken) {
        RegistrationRequest request = registrationRequestRepository
                .findByEmailAndTrackingToken(email, trackingToken)
                .orElseThrow(() -> new BusinessException("REG_NOT_FOUND", "등록 신청을 찾을 수 없습니다."));
        return registrationMapper.toStatusResponse(request);
    }

    public Page<RegistrationListResponse> getRegistrations(RegistrationStatus status, Pageable pageable) {
        Page<RegistrationRequest> page;
        if (status == null) {
            page = registrationRequestRepository.findAll(pageable);
        } else {
            page = registrationRequestRepository.findByStatus(status, pageable);
        }
        return page.map(registrationMapper::toListResponse);
    }

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void expirePendingRequests() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        int count = registrationRequestRepository.updateStatusByStatusAndCreatedAtBefore(
                RegistrationStatus.EXPIRED, RegistrationStatus.PENDING, cutoff);
        if (count > 0) {
            log.info("Expired {} pending registration requests older than 14 days", count);
        }
    }

    @Transactional
    public void approve(Long requestId, ApproveRegistrationRequest dto, CustomUserDetails admin) {
        RegistrationRequest reg = registrationRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("REG_NOT_FOUND", "등록 신청을 찾을 수 없습니다."));

        if (reg.getStatus() != RegistrationStatus.PENDING) {
            throw new BusinessException("REG_INVALID_STATUS", "대기 상태의 신청만 처리할 수 있습니다.");
        }

        // Validate employee_no uniqueness
        if (userRepository.existsByEmployeeNo(dto.employeeNo())) {
            throw new BusinessException("ORG_DUPLICATE_EMPLOYEE_NO", "이미 존재하는 사번입니다.");
        }

        // Validate department
        departmentRepository.findById(dto.departmentId())
                .filter(d -> d.isActive())
                .orElseThrow(() -> new BusinessException("ORG_DEPARTMENT_NOT_FOUND", "유효한 부서를 찾을 수 없습니다."));

        // Validate position
        positionRepository.findById(dto.positionId())
                .filter(p -> p.isActive())
                .orElseThrow(() -> new BusinessException("ORG_POSITION_NOT_FOUND", "유효한 직급을 찾을 수 없습니다."));

        // Create user with DIRECT password hash transfer (D-07: NO passwordEncoder.encode() call)
        User user = new User();
        user.setEmployeeNo(dto.employeeNo());
        user.setName(reg.getName());
        user.setEmail(reg.getEmail());
        user.setPassword(reg.getPasswordHash());  // Direct hash transfer!
        user.setDepartmentId(dto.departmentId());
        user.setPositionId(dto.positionId());
        user.setRole(UserRole.USER);       // D-06: always USER
        user.setStatus(UserStatus.ACTIVE);
        user.setMustChangePassword(false);
        user = userRepository.save(user);

        // Update registration request (clear password hash for data minimization)
        reg.setPasswordHash(null);
        reg.setStatus(RegistrationStatus.APPROVED);
        reg.setApprovedBy(admin.getUserId());
        reg.setProcessedAt(LocalDateTime.now());
        registrationRequestRepository.save(reg);

        // Audit log
        auditLogService.log(admin.getUserId(), "REGISTRATION_APPROVED", "REGISTRATION_REQUEST",
                reg.getId(), Map.of("userId", user.getId(), "email", reg.getEmail()));
    }

    @Transactional
    public void reject(Long requestId, RejectRegistrationRequest dto, CustomUserDetails admin) {
        RegistrationRequest reg = registrationRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("REG_NOT_FOUND", "등록 신청을 찾을 수 없습니다."));

        if (reg.getStatus() != RegistrationStatus.PENDING) {
            throw new BusinessException("REG_INVALID_STATUS", "대기 상태의 신청만 처리할 수 있습니다.");
        }

        reg.setStatus(RegistrationStatus.REJECTED);
        reg.setRejectionReason(dto.rejectionReason());
        reg.setApprovedBy(admin.getUserId());
        reg.setProcessedAt(LocalDateTime.now());
        registrationRequestRepository.save(reg);

        // Audit log
        auditLogService.log(admin.getUserId(), "REGISTRATION_REJECTED", "REGISTRATION_REQUEST",
                reg.getId(), Map.of("email", reg.getEmail(), "reason", dto.rejectionReason()));
    }
}
