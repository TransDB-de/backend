using System.Security.Cryptography;
using System.Text;

namespace transdb_backend_net.Utils;

public static class TokenUtil
{
    private static readonly DateTime CustomEpoch = new(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
    
    private const int DefaultTokenLength = 32;
    
    /// <summary>
    /// Generate a random token in base 36 format.
    /// Its entropy consists of a millisecond timestamp from a custom static epoch and random bytes.
    /// </summary>
    /// <param name="length"></param>
    /// <param name="epoch"></param>
    /// <returns></returns>
    public static string Generate(int? length, DateTime? epoch = null)
    {
        var time = CustomTimestampFromEpoch(DateTime.UtcNow, epoch ?? CustomEpoch);

        var token = new StringBuilder();
        
        token.Append(Base36.Encode(time));
        
        var totalTokenLength = length ?? DefaultTokenLength;
        
        var remaining = totalTokenLength - token.Length;

        if (remaining <= 0)
        {
            return token.ToString()[..totalTokenLength];
        }
        
        while (token.Length < totalTokenLength)
        {
            var chunkBytes = RandomNumberGenerator.GetBytes(8); // cause ulong 8-byte;
            var chunkValue = BitConverter.ToUInt64(chunkBytes);
            token.Append(Base36.Encode(chunkValue));
        }

        return token.ToString(0, totalTokenLength);
    }

    public static long CustomTimestampFromEpoch(DateTime time, DateTime epoch) => (long)(time - epoch).TotalMilliseconds;
}