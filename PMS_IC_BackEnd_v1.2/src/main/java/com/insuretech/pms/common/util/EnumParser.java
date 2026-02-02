package com.insuretech.pms.common.util;

import java.util.function.Supplier;

/**
 * Generic utility class for parsing enum values from strings.
 * Eliminates duplicate enum parsing patterns across services.
 *
 * Usage:
 *   TaskStatus status = EnumParser.parse(statusString, TaskStatus.class, TaskStatus.TO_DO);
 *   Priority priority = EnumParser.parse(priorityString, Priority.class, Priority.MEDIUM);
 */
public final class EnumParser {

    private EnumParser() {
        // Utility class - prevent instantiation
    }

    /**
     * Parse a string to an enum value with a default fallback.
     *
     * @param value The string value to parse
     * @param enumClass The enum class
     * @param defaultValue The default value if parsing fails or value is blank
     * @param <T> The enum type
     * @return The parsed enum value or default
     */
    public static <T extends Enum<T>> T parse(String value, Class<T> enumClass, T defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Enum.valueOf(enumClass, value.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return defaultValue;
        }
    }

    /**
     * Parse a string to an enum value with a lazy default supplier.
     * Useful when default value computation is expensive.
     *
     * @param value The string value to parse
     * @param enumClass The enum class
     * @param defaultSupplier Supplier for the default value
     * @param <T> The enum type
     * @return The parsed enum value or default from supplier
     */
    public static <T extends Enum<T>> T parse(String value, Class<T> enumClass, Supplier<T> defaultSupplier) {
        if (value == null || value.isBlank()) {
            return defaultSupplier.get();
        }
        try {
            return Enum.valueOf(enumClass, value.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return defaultSupplier.get();
        }
    }

    /**
     * Parse a string to an enum value, returning null if parsing fails.
     *
     * @param value The string value to parse
     * @param enumClass The enum class
     * @param <T> The enum type
     * @return The parsed enum value or null
     */
    public static <T extends Enum<T>> T parseOrNull(String value, Class<T> enumClass) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(enumClass, value.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Check if a string is a valid enum value.
     *
     * @param value The string value to check
     * @param enumClass The enum class
     * @param <T> The enum type
     * @return true if the value can be parsed to the enum
     */
    public static <T extends Enum<T>> boolean isValid(String value, Class<T> enumClass) {
        return parseOrNull(value, enumClass) != null;
    }
}
