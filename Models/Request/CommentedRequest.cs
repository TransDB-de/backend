using System.ComponentModel.DataAnnotations;

namespace transdb_backend_net.Models.Request;

public class CommentedRequest
{
    [Required(ErrorMessage = "required"), StringLength(2000, MinimumLength = 1, ErrorMessage = "length")]
    public string Comment { get; set; } = string.Empty;
}
