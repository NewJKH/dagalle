package org.jkh.com.dagalle.domain.plan.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ReorderRequest {

    @NotNull
    private List<Long> order;
}
