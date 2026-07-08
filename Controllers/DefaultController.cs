using Microsoft.AspNetCore.Mvc;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Services;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("/")]
public class DefaultController(IDatabaseService db) : ControllerBase
{
    /// <summary>Returns 200 OK if the server is reachable.</summary>
    [HttpGet("health")]
    public async Task<IActionResult> Healthcheck()
    {
        var healthy = await db.Healthcheck();
        
        if (!healthy)
        {
            return new ApplicationUnhealthyApiError();
        }
        
        return Ok();
    }
}
