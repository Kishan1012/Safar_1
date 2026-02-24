/**
 * Auth Service — pure business logic, no HTTP, no SQL.
 * Easily unit-testable in isolation.
 */

import bcrypt from 'bcryptjs';
import * as userRepo from '../repositories/user.repository';

const SALT_ROUNDS = 12;

// ─── Password ─────────────────────────────────────────────────────────────────

export const hashPassword = (plain: string): Promise<string> =>
    bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
    bcrypt.compare(plain, hash);

// ─── Custom Errors ─────────────────────────────────────────────────────────────

export class EmailTakenError extends Error {
    constructor() { super('Email already registered'); this.name = 'EmailTakenError'; }
}

export class InvalidCredentialsError extends Error {
    constructor() { super('Invalid email or password'); this.name = 'InvalidCredentialsError'; }
}

export class AccountLockedError extends Error {
    public readonly lockedUntil: string;
    constructor(lockedUntil: string) {
        super('Account locked due to too many failed attempts. Try again later.');
        this.name = 'AccountLockedError';
        this.lockedUntil = lockedUntil;
    }
}

// ─── Registration ─────────────────────────────────────────────────────────────

export const register = async (email: string, name: string, password: string) => {
    if (await userRepo.emailExists(email)) throw new EmailTakenError();
    const passwordHash = await hashPassword(password);
    return userRepo.createUser(email, name, passwordHash);
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (email: string, password: string) => {
    const user = await userRepo.findByEmail(email);

    // Always run bcrypt even when user doesn't exist to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingprotection000000000000000000000000000';
    const hashToCompare = user?.password_hash ?? dummyHash;

    // Check lockout before verifying password (fail fast)
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
        throw new AccountLockedError(user.locked_until);
    }

    const valid = await verifyPassword(password, hashToCompare);

    if (!user || !valid) {
        // Record failure only for real users (don't expose user existence via DB write timing)
        if (user) await userRepo.recordFailedAttempt(user.id);
        throw new InvalidCredentialsError();
    }

    // Success — reset lockout state
    await userRepo.resetFailedAttempts(user.id);

    // Strip sensitive fields before returning
    const { password_hash: _, failed_attempts: __, locked_until: ___, ...publicUser } = user;
    return publicUser;
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = (userId: string) => userRepo.findById(userId);
