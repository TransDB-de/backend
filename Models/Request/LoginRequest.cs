using System.ComponentModel.DataAnnotations;

namespace transdb_backend_net.Models.Request;

public class LoginRequest
{
    [Required(ErrorMessage = "required"), EmailAddress(ErrorMessage = "malformed_email")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "required")]
    public string Password { get; set; } = string.Empty;
}
