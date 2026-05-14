package org.jkh.com.dagalle.domain.plan.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.util.List;

@Getter
public class ReorderRequest {

    @NotNull
    private List<Long> order;
}
