package com.insuretech.pms.auth.service;

import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.Collections;

@Service
@RequiredArgsConstructor
public class ReactiveUserDetailsServiceImpl implements ReactiveUserDetailsService {

    private final ReactiveUserRepository reactiveUserRepository;

    @Override
    public Mono<UserDetails> findByUsername(String email) {
        return reactiveUserRepository.findByEmailAndActiveTrue(email)
                .switchIfEmpty(Mono.error(new UsernameNotFoundException("User not found with email: " + email)))
                .map(this::toUserDetails);
    }

    private UserDetails toUserDetails(R2dbcUser user) {
        return new User(
                user.getEmail(),
                user.getPassword(),
                user.getActive(),
                true,
                true,
                true,
                getAuthorities(user)
        );
    }

    private Collection<? extends GrantedAuthority> getAuthorities(R2dbcUser user) {
        return Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + user.getRole())
        );
    }
}
