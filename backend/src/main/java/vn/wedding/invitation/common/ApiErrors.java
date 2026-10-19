package vn.wedding.invitation.common;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
    public static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.FORBIDDEN, "Thiệp chưa mở hoặc hiện không khả dụng."); }
    public static void require(boolean condition, String message) { if (!condition) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, message); }
    public static void version(long actual, long expected) { if(actual != expected) throw new ResponseStatusException(HttpStatus.CONFLICT, "Dữ liệu đã thay đổi. Vui lòng tải lại trước khi lưu."); }
    /** PIN is enabled and not verified in this session; the guest UI shows the PIN step instead of a generic failure (FR19). */
    public static ResponseStatusException pinRequired() { return new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "Lời mời này cần mã PIN. Hãy nhập mã PIN để mở thiệp."); }
    /** Generic on purpose: it must not reveal whether a PIN exists or how close a guess was. */
    public static ResponseStatusException pinIncorrect() { return new ResponseStatusException(HttpStatus.FORBIDDEN, "Mã PIN không đúng. Vui lòng kiểm tra lại."); }
    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail business(ResponseStatusException e) { return ProblemDetail.forStatusAndDetail(e.getStatusCode(), e.getReason()); }
    @ExceptionHandler({IllegalArgumentException.class, org.springframework.web.bind.MethodArgumentNotValidException.class, org.springframework.http.converter.HttpMessageNotReadableException.class})
    ProblemDetail invalid(Exception e) { return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ. Kiểm tra các trường và thử lại."); }
    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    ProblemDetail database(Exception e) { return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, "Không thể lưu hoặc đọc dữ liệu. Vui lòng thử lại."); }
}