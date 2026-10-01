package com.driverapp.userservice.repository;

import com.driverapp.userservice.models.Role;
import com.driverapp.userservice.models.enums.RoleCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByRoleCode(RoleCode roleCode);
}