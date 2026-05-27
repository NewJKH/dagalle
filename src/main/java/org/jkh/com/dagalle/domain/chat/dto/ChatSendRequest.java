package org.jkh.com.dagalle.domain.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatSendRequest {
    @NotBlank
    @Size(max = 1000)
    private String content;
}
