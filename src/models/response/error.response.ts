import { StatusCode } from "../../types/httpStatusCodes";
import ResponseBody from "../response"

export const responseErrorCodes = {
	"invalid_authorization_header": StatusCode.Unauthorized,
	"unauthorized": StatusCode.Unauthorized,
	"no_admin": StatusCode.Forbidden,
	"user_exists": StatusCode.Conflict,
	"wrong_credentials": StatusCode.Unauthorized,
	"validation_error": StatusCode.UnprocessableEntity,
	"invalid_verification": StatusCode.BadRequest,
	"not_found": StatusCode.NotFound,
	"reset_failed": StatusCode.InternalServerError,
	"backup_failed": StatusCode.InternalServerError,
	"compilation_failed": StatusCode.UnprocessableEntity,
	"not_updated": StatusCode.InternalServerError,
	"not_deleted": StatusCode.InternalServerError
} as const;

export type ResponseErrorCode = keyof typeof responseErrorCodes;
