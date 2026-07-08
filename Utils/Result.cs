using transdb_backend_net.Exceptions;

namespace transdb_backend_net.Utils;

/// <summary>
/// Distinguishes between expected business-logic failures (e.g. "entry not found") and
/// unexpected technical failures (e.g. an exception from an external service).
/// Controllers use this to decide which HTTP error to return.
/// </summary>
public enum EFailureType
{
    None,
    Expected,
    Unexpected
}

/// <summary>
/// Represents the outcome of an operation that can either succeed or fail with a reason.
/// Use <see cref="Ok"/> / <see cref="Failure(string, EFailureType)"/> as factory methods.
/// </summary>
public class Result
{
    public bool IsOk => FailureType == EFailureType.None;
    public bool IsFailed => !IsOk;
    public string? FailureDetails { get; }
    public EFailureType FailureType { get; }

    protected Result(string? details = null, EFailureType type = EFailureType.None)
    {
        FailureDetails = details;
        FailureType = type;
    }

    public static Result Ok() => new();
    public static Result Failure(string error, EFailureType type = EFailureType.Expected) => new(error, type);
    public static Result Failure(Exception e) => new(e.Message, EFailureType.Unexpected);

    /// <summary>Promotes a typed failure into a non-generic result, preserving the failure details.</summary>
    public static Result Failure<T>(Result<T> r) where T : class => new(r.FailureDetails, r.FailureType);

    /// <summary>
    /// Returns either <paramref name="expected"/> or <paramref name="unexpected"/> based on the failure type,
    /// allowing callers to map business errors to 4xx and technical errors to 5xx responses.
    /// </summary>
    public ApiError SelectApiError(ApiError expected, ApiError unexpected)
    {
        if (FailureType == EFailureType.Expected)
        {
            return expected;
        }

        return unexpected;
    }
}

/// <summary>
/// A <see cref="Result"/> that carries a value on success.
/// <typeparamref name="T"/> is constrained to reference types because value types can be
/// returned as-is without wrapping, and nullability then serves as the failure signal.
/// </summary>
public class Result<T> : Result where T : class
{
    public T? Value { get; }

    public Result(T? value, string? details = null, EFailureType type = EFailureType.None)
        : base(details, type)
    {
        Value = value;
    }

    public static Result<T> Success(T value) => new(value);
    public new static Result<T> Failure(string error, EFailureType type = EFailureType.Expected) => new(null, error, type);
    public new static Result<T> Failure(Exception e) => new(null, e.Message, EFailureType.Unexpected);
    public new static Result<T> Failure<TB>(Result<TB> r) where TB : class => new(null, r.FailureDetails, r.FailureType);
}
