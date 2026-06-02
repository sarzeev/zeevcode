package com.project.zeevCode.config;

import com.project.zeevCode.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class FirebaseAutoProvisioningFilter extends OncePerRequestFilter {

    private final UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String firebaseUid = jwt.getSubject();
            String email = jwt.getClaimAsString("email");
            String name = jwt.getClaimAsString("name");

            if (firebaseUid != null && email != null) {
                try {
                    com.project.zeevCode.entity.User dbUser = userService.getOrCreateUserFromFirebase(firebaseUid, email, name);
                    
                    if (!dbUser.isActive()) {
                        log.warn("Attempt to authenticate disabled user: {}", dbUser.getUsername());
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Account disabled");
                        return;
                    }
                    
                    // Inject DB role into SecurityContext
                    java.util.List<org.springframework.security.core.GrantedAuthority> authorities = 
                            java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + dbUser.getRole().name()));
                    
                    org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken newAuth = 
                            new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(jwt, authorities);
                    
                    SecurityContextHolder.getContext().setAuthentication(newAuth);
                } catch (Exception e) {
                    log.error("Failed to auto-provision user from Firebase token", e);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
