package org.vision.autocomplete.exception;

// Import statements
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
/**
 * Exception thrown when a requested resource cannot be found.
 * This will trigger a 404 NOT_FOUND response when thrown in a controller.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    // Constructor with message only
    public ResourceNotFoundException(String message) {
        super(message);
    }
    // Constructor with message and cause
    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
    // Constructor with resource name, field name and field value
    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s not found with %s : '%s'", resourceName, fieldName, fieldValue));
    }
}
