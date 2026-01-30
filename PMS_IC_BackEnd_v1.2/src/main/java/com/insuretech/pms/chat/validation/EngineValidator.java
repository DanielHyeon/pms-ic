package com.insuretech.pms.chat.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Set;

/**
 * Validator for LLM engine field.
 * Validates that the engine is one of the supported values.
 */
public class EngineValidator implements ConstraintValidator<ValidEngine, String> {

    private static final Set<String> VALID_ENGINES = Set.of("auto", "gguf", "vllm", "ab");

    @Override
    public void initialize(ValidEngine constraintAnnotation) {
        // No initialization needed
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // Null is valid (will default to "auto")
        if (value == null || value.isEmpty()) {
            return true;
        }

        return VALID_ENGINES.contains(value.toLowerCase());
    }
}
