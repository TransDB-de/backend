using transdb_backend_net.Services;

namespace transdb_backend_net.Models.Response;

public class UserResponse
{
    public UserResponse(DirectusUser user)
    {
        Id = user.Id;
        Name = user.FirstName + (user.LastName != null ? " " + user.LastName : "");
    }
    
    public UserResponse(string id, string name)
    {
        Id = id;
        Name = name;
    }
    
    public string Id { get; set; }
    public string Name { get; set; }
}