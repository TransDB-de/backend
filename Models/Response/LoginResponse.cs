namespace transdb_backend_net.Models.Response;

public class LoginResponse
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public bool Admin { get; set; }
}
