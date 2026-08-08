"""
Custom exceptions + a single common error envelope.
Keeps route handlers free of try/except boilerplate: we raise these,
and main.py registers handlers that convert them into the JSON shape
{ "error": true, "detail": "...", "code": "..." }.
"""
from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base class for all app-level exceptions."""
    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, detail: str, code: str | None = None, status_code: int | None = None):
        self.detail = detail
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        super().__init__(detail)


class InvalidFileTypeError(AppException):
    status_code = 400
    code = "INVALID_FILE_TYPE"


class FileTooLargeError(AppException):
    status_code = 413
    code = "FILE_TOO_LARGE"


class DocumentNotFoundError(AppException):
    status_code = 404
    code = "DOCUMENT_NOT_FOUND"


class EmptyQuestionError(AppException):
    status_code = 400
    code = "EMPTY_QUESTION"


class NoDocumentsIndexedError(AppException):
    status_code = 404
    code = "NO_DOCUMENTS_INDEXED"


class LLMProviderError(AppException):
    status_code = 502
    code = "LLM_PROVIDER_ERROR"


class AccessRestrictedError(AppException):
    status_code = 403
    code = "ACCESS_RESTRICTED"


class UnauthorizedError(AppException):
    status_code = 401
    code = "UNAUTHORIZED"


class ExtractionError(AppException):
    status_code = 500
    code = "EXTRACTION_FAILED"


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "detail": exc.detail, "code": exc.code},
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": True, "detail": "An unexpected error occurred.", "code": "INTERNAL_ERROR"},
    )
