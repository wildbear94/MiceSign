package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.OptionItem;
import com.micesign.domain.OptionSet;
import com.micesign.dto.option.CreateOptionSetRequest;
import com.micesign.dto.option.OptionItemResponse;
import com.micesign.dto.option.OptionSetResponse;
import com.micesign.repository.OptionSetRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/option-sets")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminOptionSetController {

    private final OptionSetRepository optionSetRepository;

    public AdminOptionSetController(OptionSetRepository optionSetRepository) {
        this.optionSetRepository = optionSetRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OptionSetResponse>>> listOptionSets() {
        List<OptionSetResponse> result = optionSetRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OptionSetResponse>> getOptionSet(@PathVariable Long id) {
        OptionSet optionSet = optionSetRepository.findById(id)
                .orElseThrow(() -> new BusinessException("OPTION_SET_NOT_FOUND",
                        "옵션셋을 찾을 수 없습니다: " + id, 404));
        return ResponseEntity.ok(ApiResponse.ok(toResponse(optionSet)));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<OptionSetResponse>> createOptionSet(
            @Valid @RequestBody CreateOptionSetRequest request) {

        if (optionSetRepository.existsByName(request.name())) {
            throw new BusinessException("OPTION_SET_DUPLICATE",
                    "이미 존재하는 옵션셋 이름입니다: " + request.name());
        }

        OptionSet optionSet = new OptionSet();
        optionSet.setName(request.name());
        optionSet.setDescription(request.description());

        if (request.items() != null) {
            for (CreateOptionSetRequest.OptionItemRequest itemReq : request.items()) {
                OptionItem item = new OptionItem();
                item.setValue(itemReq.value());
                item.setLabel(itemReq.label());
                item.setSortOrder(itemReq.sortOrder());
                item.setOptionSet(optionSet);
                optionSet.getItems().add(item);
            }
        }

        optionSet = optionSetRepository.save(optionSet);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(toResponse(optionSet)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<OptionSetResponse>> updateOptionSet(
            @PathVariable Long id,
            @Valid @RequestBody CreateOptionSetRequest request) {

        OptionSet optionSet = optionSetRepository.findById(id)
                .orElseThrow(() -> new BusinessException("OPTION_SET_NOT_FOUND",
                        "옵션셋을 찾을 수 없습니다: " + id, 404));

        optionSet.setName(request.name());
        optionSet.setDescription(request.description());

        // Replace items (orphanRemoval handles deletion)
        optionSet.getItems().clear();
        if (request.items() != null) {
            for (CreateOptionSetRequest.OptionItemRequest itemReq : request.items()) {
                OptionItem item = new OptionItem();
                item.setValue(itemReq.value());
                item.setLabel(itemReq.label());
                item.setSortOrder(itemReq.sortOrder());
                item.setOptionSet(optionSet);
                optionSet.getItems().add(item);
            }
        }

        optionSet = optionSetRepository.save(optionSet);
        return ResponseEntity.ok(ApiResponse.ok(toResponse(optionSet)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteOptionSet(@PathVariable Long id) {
        OptionSet optionSet = optionSetRepository.findById(id)
                .orElseThrow(() -> new BusinessException("OPTION_SET_NOT_FOUND",
                        "옵션셋을 찾을 수 없습니다: " + id, 404));
        optionSet.setActive(false);
        optionSetRepository.save(optionSet);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private OptionSetResponse toResponse(OptionSet os) {
        List<OptionItemResponse> items = os.getItems().stream()
                .filter(OptionItem::isActive)
                .map(item -> new OptionItemResponse(
                        item.getId(),
                        item.getValue(),
                        item.getLabel(),
                        item.getSortOrder(),
                        item.isActive()))
                .toList();

        return new OptionSetResponse(
                os.getId(),
                os.getName(),
                os.getDescription() != null ? os.getDescription() : "",
                os.isActive(),
                items
        );
    }
}
