package org.jkh.com.dagalle.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        ErrorCode code = e.getErrorCode();
        // BusinessException(errorCode, customMessage) 형태면 커스텀 메시지 우선 사용
        String msg = (e.getMessage() != null && !e.getMessage().equals(code.getMessage()))
                ? e.getMessage() : code.getMessage();
        return ResponseEntity.status(code.getStatus()).body(ApiResponse.fail(msg));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.fail(message));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException e) {
        log.error("[IllegalStateException] {}", e.getMessage(), e);
        String msg = e.getMessage() != null ? e.getMessage() : ErrorCode.EXTERNAL_API_ERROR.getMessage();
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.fail(msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("[서버 내부 오류] {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.fail(ErrorCode.SERVER_ERROR.getMessage()));
    }
}
