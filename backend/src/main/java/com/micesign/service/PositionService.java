package com.micesign.service;

import com.micesign.common.AuditAction;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Position;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.position.*;
import com.micesign.mapper.PositionMapper;
import com.micesign.repository.PositionRepository;
import com.micesign.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PositionService {

    private final PositionRepository positionRepository;
    private final UserRepository userRepository;
    private final PositionMapper positionMapper;
    private final AuditLogService auditLogService;

    public PositionService(PositionRepository positionRepository,
                           UserRepository userRepository,
                           PositionMapper positionMapper,
                           AuditLogService auditLogService) {
        this.positionRepository = positionRepository;
        this.userRepository = userRepository;
        this.positionMapper = positionMapper;
        this.auditLogService = auditLogService;
    }

    public List<PositionResponse> getAllPositions() {
        List<Position> positions = positionRepository.findAllByOrderBySortOrderAsc();
        return positions.stream()
            .map(p -> {
                int userCount = (int) userRepository.countByPositionIdAndStatus(p.getId(), UserStatus.ACTIVE);
                return positionMapper.toResponse(p, userCount);
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public PositionResponse createPosition(CreatePositionRequest request, Long actingUserId) {
        if (positionRepository.existsByName(request.name())) {
            throw new BusinessException("ORG_DUPLICATE_NAME", "이미 존재하는 직급명입니다.");
        }

        List<Position> existing = positionRepository.findAllByOrderBySortOrderAsc();
        int maxSortOrder = existing.stream()
            .mapToInt(Position::getSortOrder)
            .max()
            .orElse(0);

        Position position = new Position();
        position.setName(request.name());
        position.setSortOrder(maxSortOrder + 1);
        position.setActive(true);

        position = positionRepository.save(position);

        auditLogService.log(actingUserId, AuditAction.ADMIN_ORG_EDIT, "POSITION", position.getId(),
                Map.of("action", "create", "name", position.getName()));

        return positionMapper.toResponse(position, 0);
    }

    @Transactional
    public PositionResponse updatePosition(Long id, UpdatePositionRequest request, Long actingUserId) {
        Position position = positionRepository.findById(id)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "직급을 찾을 수 없습니다."));

        if (positionRepository.existsByNameAndIdNot(request.name(), id)) {
            throw new BusinessException("ORG_DUPLICATE_NAME", "이미 존재하는 직급명입니다.");
        }

        position.setName(request.name());
        position = positionRepository.save(position);

        auditLogService.log(actingUserId, AuditAction.ADMIN_ORG_EDIT, "POSITION", position.getId(),
                Map.of("action", "update", "name", position.getName()));

        int userCount = (int) userRepository.countByPositionIdAndStatus(id, UserStatus.ACTIVE);
        return positionMapper.toResponse(position, userCount);
    }

    @Transactional
    public void reorderPositions(ReorderPositionsRequest request) {
        List<Long> orderedIds = request.orderedIds();
        for (int i = 0; i < orderedIds.size(); i++) {
            Position position = positionRepository.findById(orderedIds.get(i))
                .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "직급을 찾을 수 없습니다."));
            position.setSortOrder(i);
            positionRepository.save(position);
        }
    }

    @Transactional
    public void deactivatePosition(Long id, Long actingUserId) {
        Position position = positionRepository.findById(id)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "직급을 찾을 수 없습니다."));

        long activeUsers = userRepository.countByPositionIdAndStatus(id, UserStatus.ACTIVE);
        if (activeUsers > 0) {
            throw new BusinessException("ORG_HAS_ACTIVE_USERS", "활성 사용자가 있어 비활성화할 수 없습니다.");
        }

        position.setActive(false);
        positionRepository.save(position);

        auditLogService.log(actingUserId, AuditAction.ADMIN_ORG_EDIT, "POSITION", position.getId(),
                Map.of("action", "deactivate", "name", position.getName()));
    }
}
