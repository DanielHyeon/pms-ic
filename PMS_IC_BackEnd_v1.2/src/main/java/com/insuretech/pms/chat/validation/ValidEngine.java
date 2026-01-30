package com.insuretech.pms.chat.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Validates that the engine field contains a valid LLM engine identifier.
 * Valid values: "auto", "gguf", "vllm", "ab", or null (defaults to "auto").
 */
@Documented
@Constraint(validatedBy = EngineValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidEngine {

    String message() default "Engine must be one of: auto, gguf, vllm, ab";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
