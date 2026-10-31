import { ConflictException } from "@nestjs/common";
import { UserService } from "@apps/core-api/modules/user/user.service";
import { CreateUserDto } from "@apps/core-api/modules/user/dto/create-user.dto";

const makeRepository = (): any => ({
  create: jest.fn((row) => ({ ...row })),
  save: jest.fn(async (row) => Object.assign(row, { id: 7 })),
  getOne: jest.fn(async (id) => ({ id })),
  getAll: jest.fn(async () => []),
});

describe("UserService.create", () => {
  it("stores a scrypt hash, never the raw password", async () => {
    const repository = makeRepository();
    await new UserService(repository).create({ name: "Rahim", email: "rahim@example.com", password: "correct-horse" } as CreateUserDto);

    const saved = repository.save.mock.calls[0][0];
    expect(saved.password).toBeUndefined();
    expect(saved.password_hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(JSON.stringify(saved)).not.toContain("correct-horse");
  });

  it("leaves password_hash null for a phone-only user", async () => {
    const repository = makeRepository();
    await new UserService(repository).create({ name: "Karim", phone: "+8801712345678" } as CreateUserDto);

    expect(repository.save.mock.calls[0][0].password_hash).toBeNull();
  });

  it("returns the saved row read back through getOne, never the entity it saved", async () => {
    const repository = makeRepository();
    const result = await new UserService(repository).create({
      name: "Rahim",
      email: "rahim@example.com",
      password: "correct-horse",
    } as CreateUserDto);

    expect(repository.getOne).toHaveBeenCalledWith(7);
    expect(result).toEqual({ id: 7 });
  });

  it("turns a unique-index violation from a lost race into 409", async () => {
    const repository = makeRepository();
    repository.save.mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" }));

    await expect(new UserService(repository).create({ name: "Rahim", phone: "+8801712345678" } as CreateUserDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("rethrows any other database error untouched", async () => {
    const repository = makeRepository();
    const failure = Object.assign(new Error("check violation"), { code: "23514" });
    repository.save.mockRejectedValue(failure);

    await expect(new UserService(repository).create({ name: "Rahim", phone: "+8801712345678" } as CreateUserDto)).rejects.toBe(failure);
  });
});
