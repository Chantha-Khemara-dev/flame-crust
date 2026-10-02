package com.flamecrust.api.security;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class EmailSecurityValidator {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,15}$"
    );

    // Known keywords in disposable email domains
    private static final String[] DISPOSABLE_KEYWORDS = {
            "guerrilla", "mailtm", "mailgw", "tempmail", "throwaway", "disposable",
            "10minute", "burner", "fakeinbox", "fakemail", "trashmail", "yopmail",
            "sharklasers", "pokemail", "spam4me", "grr.la", "mohmal", "getnada",
            "maildrop", "inboxkitten", "dispostable", "crazymailing", "uberip"
    };

    // Fast-lookup set of known disposable / temporary / burner email domains
    private static final Set<String> DISPOSABLE_DOMAINS;

    static {
        Set<String> domains = new HashSet<>();

        // Guerrilla Mail and variants
        domains.add("guerrillamail.com");
        domains.add("guerrillamailblock.com");
        domains.add("guerrillamail.net");
        domains.add("guerrillamail.org");
        domains.add("guerrillamail.biz");
        domains.add("guerrillamail.de");
        domains.add("guerrillamail.info");
        domains.add("grr.la");
        domains.add("sharklasers.com");
        domains.add("pokemail.net");
        domains.add("spam4.me");

        // Mail.tm / Mail.gw / UberIP
        domains.add("uberip.com");
        domains.add("mailtm.me");
        domains.add("mailtm.net");
        domains.add("mailtm.org");
        domains.add("mailto.plus");
        domains.add("fexpost.com");
        domains.add("fexbox.org");
        domains.add("fexbox.ru");
        domains.add("chitthi.in");
        domains.add("dropmail.me");
        domains.add("emlpro.com");
        domains.add("emlhub.com");
        domains.add("boximail.com");
        domains.add("tempm.com");
        domains.add("tmpmail.org");
        domains.add("tmpmail.net");

        // 10MinuteMail
        domains.add("10minutemail.com");
        domains.add("10minutemail.net");
        domains.add("10minutemail.org");
        domains.add("minutemail.com");
        domains.add("10minutemailbox.com");

        // TempMail
        domains.add("temp-mail.org");
        domains.add("tempmail.com");
        domains.add("temp-mail.io");
        domains.add("tempmailo.com");
        domains.add("tempail.com");
        domains.add("tempmailaddress.com");
        domains.add("tempinbox.com");

        // Mailinator
        domains.add("mailinator.com");
        domains.add("mailin8r.com");
        domains.add("mailinator2.com");
        domains.add("suremail.info");
        domains.add("spamherelots.com");
        domains.add("notmailinator.com");
        domains.add("reconmail.com");

        // YOPmail
        domains.add("yopmail.com");
        domains.add("yopmail.fr");
        domains.add("yopmail.net");
        domains.add("cool.fr.nf");
        domains.add("courriel.fr.nf");
        domains.add("jetable.fr.nf");
        domains.add("nospam.ze.tc");
        domains.add("nomail.xl.cx");
        domains.add("mega.zik.dj");
        domains.add("speed.1s.fr");

        // Other popular disposable email services
        domains.add("trashmail.com");
        domains.add("trashmail.net");
        domains.add("trashmail.me");
        domains.add("trashmail.org");
        domains.add("dispostable.com");
        domains.add("maildrop.cc");
        domains.add("inboxkitten.com");
        domains.add("getnada.com");
        domains.add("nada.ltd");
        domains.add("throwawaymail.com");
        domains.add("burnermail.io");
        domains.add("crazymailing.com");
        domains.add("mohmal.com");
        domains.add("mohmal.im");
        domains.add("fakemailgenerator.com");
        domains.add("emailondeck.com");
        domains.add("getairmail.com");
        domains.add("generator.email");
        domains.add("emailfake.com");
        domains.add("tempmail.ninja");
        domains.add("mintemail.com");
        domains.add("trash-mail.com");
        domains.add("mytemp.email");
        domains.add("mytempmail.com");
        domains.add("mytrashmail.com");
        domains.add("hidemyass.com");
        domains.add("incognitomail.org");
        domains.add("maildrop.cc");
        domains.add("tempmailer.com");
        domains.add("burnermail.com");
        domains.add("anonymousemail.me");
        domains.add("zillamail.com");
        domains.add("zoemail.org");
        domains.add("sharklasers.com");

        DISPOSABLE_DOMAINS = Collections.unmodifiableSet(domains);
    }

    /**
     * Checks if email string matches general email format.
     */
    public boolean isValidFormat(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        String clean = email.trim();
        if (clean.length() < 5 || clean.length() > 254) {
            return false;
        }
        return EMAIL_PATTERN.matcher(clean).matches();
    }

    /**
     * Checks if email domain is a known disposable or temporary email provider.
     */
    public boolean isDisposable(String email) {
        if (email == null || !email.contains("@")) {
            return true;
        }
        String domain = email.substring(email.lastIndexOf("@") + 1).toLowerCase(Locale.ROOT).trim();
        if (domain.isEmpty()) {
            return true;
        }

        // Direct domain match
        if (DISPOSABLE_DOMAINS.contains(domain)) {
            return true;
        }

        // Subdomain matching (e.g., sub.guerrillamail.com)
        for (String disp : DISPOSABLE_DOMAINS) {
            if (domain.endsWith("." + disp)) {
                return true;
            }
        }

        // Heuristic keyword matching in domain
        for (String keyword : DISPOSABLE_KEYWORDS) {
            if (domain.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validates email format and ensures it is not a disposable address.
     * Returns null if valid, or a descriptive error message if invalid.
     */
    public String validateEmailOrError(String email) {
        if (email == null || email.isBlank()) {
            return "Email is required";
        }
        String trimmed = email.trim().toLowerCase(Locale.ROOT);
        if (!isValidFormat(trimmed)) {
            return "Please provide a valid email address format (e.g. user@example.com)";
        }
        if (isDisposable(trimmed)) {
            return "Disposable and temporary email addresses are not permitted. Please use a permanent email provider (such as Gmail, Outlook, Yahoo, or iCloud).";
        }
        return null;
    }
}
