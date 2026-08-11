using System.Text;

namespace transdb_backend_net.Utils;

/// <summary>
/// Base 36 util, cause it can store more data than hex but is also case-insensitive compared to base 64
/// </summary>
public static class Base36
{
    private const string Alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    /// <summary>
    /// Encodes integers as uppercase base36 strings
    /// </summary>
    /// <param name="value">numeric value</param>
    /// <returns>Base36 uppercase string</returns>
    public static string Encode(ulong value)
    {
        if (value == 0)
        {
            return "0";
        }

        var digits = new StringBuilder();
        var remainingValue = value;
        
        while (remainingValue > 0)
        {
            var digitValue = remainingValue % 36;
            var digitCharacter = Alphabet[(int)digitValue];
            digits.Insert(0, digitCharacter);

            remainingValue = remainingValue / 36;
        }

        return digits.ToString();
    }

    /// <inheritdoc cref="Encode(ulong)" />
    public static string Encode(long value) => Encode((ulong)Math.Max(value, 0));
}
