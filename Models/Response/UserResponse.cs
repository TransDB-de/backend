using transdb_backend_net.Services;

namespace transdb_backend_net.Models.Response;

public class UserResponse(DirectusUser user)
{
    public string Id { get; set; } = user.Id;
    public string Name => user.FirstName + (user.LastName != null ? " " + user.LastName : "");
}