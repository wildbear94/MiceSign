package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.domain.LeaveType;
import com.micesign.dto.leavetype.LeaveTypeResponse;
import com.micesign.repository.LeaveTypeRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/leave-types")
public class LeaveTypeController {

    private final LeaveTypeRepository leaveTypeRepository;

    public LeaveTypeController(LeaveTypeRepository leaveTypeRepository) {
        this.leaveTypeRepository = leaveTypeRepository;
    }

    @GetMapping
    public ApiResponse<List<LeaveTypeResponse>> getLeaveTypes() {
        List<LeaveTypeResponse> response = leaveTypeRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .map(lt -> new LeaveTypeResponse(
                        lt.getId(),
                        lt.getCode(),
                        lt.getName(),
                        lt.isHalfDay(),
                        lt.getSortOrder()))
                .collect(Collectors.toList());
        return ApiResponse.ok(response);
    }
}
