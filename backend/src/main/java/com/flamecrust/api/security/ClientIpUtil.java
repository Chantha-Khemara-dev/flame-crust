package com.flamecrust.api.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class ClientIpUtil {

    private static final Pattern IPV4_PATTERN = Pattern.compile("^([0-9]{1,3}\\.){3}[0-9]{1,3}$");
    private static final Pattern IPV6_PATTERN = Pattern.compile("^[0-9a-fA-F:]+$");

    private static final String[] IP_HEADERS = {
            "CF-Connecting-IP",     // Cloudflare
            "X-Forwarded-For",      // Standard proxy header
            "X-Real-IP",            // Nginx
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_X_CLUSTER_CLIENT_IP",
            "HTTP_CLIENT_IP",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED"
    };

    /**
     * Extracts the client's real public IP address from standard reverse-proxy headers or socket.
     */
    public String getClientIp(HttpServletRequest request) {
        if (request == null) {
            return "0.0.0.0";
        }

        for (String header : IP_HEADERS) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
                // X-Forwarded-For can contain comma-separated IPs: client, proxy1, proxy2
                String[] parts = value.split(",");
                for (String part : parts) {
                    String ip = part.trim();
                    if (isValidIp(ip) && !isLocalOrPrivate(ip)) {
                        return ip;
                    }
                }
                // If all were private/local, still return the first valid one if non-empty
                String firstIp = parts[0].trim();
                if (isValidIp(firstIp)) {
                    return firstIp;
                }
            }
        }

        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr.trim() : "0.0.0.0";
    }

    private boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            return false;
        }
        return IPV4_PATTERN.matcher(ip).matches() || IPV6_PATTERN.matcher(ip).matches();
    }

    private boolean isLocalOrPrivate(String ip) {
        if (ip == null) return true;
        return ip.equals("127.0.0.1") ||
               ip.equals("0:0:0:0:0:0:0:1") ||
               ip.equals("::1") ||
               ip.startsWith("10.") ||
               ip.startsWith("192.168.") ||
               (ip.startsWith("172.") && isPrivate172(ip));
    }

    private boolean isPrivate172(String ip) {
        try {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                int secondOctet = Integer.parseInt(parts[1]);
                return secondOctet >= 16 && secondOctet <= 31;
            }
        } catch (Exception ignored) {}
        return false;
    }
}
