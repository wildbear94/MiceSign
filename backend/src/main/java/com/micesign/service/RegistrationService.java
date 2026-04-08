package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.RegistrationRequest;
import com.micesign.domain.enums.RegistrationStatus;
import com.micesign.dto.registration.*;
import com.micesign.mapper.RegistrationMapper;
import com.micesign.repository.RegistrationRequestRepository;
import com.micesign.repository.UserRepository;
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

    public RegistrationService(RegistrationRequestRepository registrationRequestRepository,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                RegistrationMapper registrationMapper,
                                AuditLogService auditLogService) {
        this.registrationRequestRepository = registrationRequestRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.registrationMapper = registrationMapper;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public RegistrationStatusResponse submit(RegistrationSubmitRequest request) {
        // Check if email already exists in user table
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new BusinessException("REG_DUPLICATE_EMAIL", "이미 등록된 이메일입니다.");
        }

        // Check if PENDING request exists for same email (only PENDING per D-03/REG-03)
        if (registrationRequestRepository.existsByEmailAndStatus(request.email(), RegistrationStatus.PENDING)) {
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

    public RegistrationStatusResponse getStatusByEmail(String email) {
        List<RegistrationRequest> requests = registrationRequestRepository.findByEmailOrderByCreatedAtDesc(email);
        if (requests.isEmpty()) {
            return null;
        }
        return registrationMapper.toStatusResponse(requests.get(0));
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
}
