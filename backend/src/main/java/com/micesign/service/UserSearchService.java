package com.micesign.service;

import com.micesign.domain.User;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.user.UserSearchResponse;
import com.micesign.repository.UserRepository;
import com.micesign.specification.UserSpecification;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserSearchService {

    private final UserRepository userRepository;

    public UserSearchService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserSearchResponse> searchUsers(String q, int size) {
        // T-30-04: size 1~50 clamp — 대량 enumeration 방지
        int limit = Math.min(Math.max(size, 1), 50);
        Specification<User> spec = UserSpecification.withFilters(
                q == null || q.isBlank() ? null : q.trim(),
                null,
                null,
                UserStatus.ACTIVE
        );
        Pageable page = PageRequest.of(0, limit);
        return userRepository.findAll(spec, page)
                .map(u -> new UserSearchResponse(
                        u.getId(),
                        u.getName(),
                        u.getDepartment() != null ? u.getDepartment().getName() : null
                ))
                .getContent();
    }
}
