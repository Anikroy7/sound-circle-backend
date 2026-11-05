import { BadRequestException, ConflictException } from "@nestjs/common";
import { UserService } from "@apps/core-api/modules/user/user.service";
import { CreateUserDto } from "@apps/core-api/modules/user/dto/create-user.dto";

const DHAKA_DIVISION = { id: 30, division_id: 30, district_id: null, subdistrict_id: null };
const DHAKA_DISTRICT = { id: 3026, division_id: 30, district_id: 3026, subdistrict_id: null };
const CHATTOGRAM_DISTRICT = { id: 2015, division_id: 20, district_id: 2015, subdistrict_id: null };

/** A fake DataSource whose transaction hands the callback a manager that records every save. */
const makeDeps = (): any => {
  const saves: any[] = [];
  const manager = {
    create: jest.fn((entity, row) => ({ __entity: entity.name, ...row })),
    save: jest.fn(async (rows) => {
      saves.push(rows);
      if (!Array.isArray(rows)) Object.assign(rows, { id: 7 });
      return rows;
    }),
  };

  return {
    saves,
    manager,
    dataSource: { transaction: jest.fn(async (work) => work(manager)) },
    userRepository: { getOne: jest.fn(async (id) => ({ id })), getAll: jest.fn(async () => []) },
    userLocationRepository: { getByUserId: jest.fn(async () => []) },
    locationRepository: {
      getByIds: jest.fn(async (ids: number[]) => [DHAKA_DIVISION, DHAKA_DISTRICT, CHATTOGRAM_DISTRICT].filter((l) => ids.includes(l.id))),
    },
  };
};

const makeService = (deps: any): UserService =>
  new UserService(deps.dataSource, deps.userRepository, deps.userLocationRepository, deps.locationRepository);

const savedUser = (deps: any): any => deps.saves.find((row: any) => row.__entity === "UserEntity");
const savedLocations = (deps: any): any[] => deps.saves.find(Array.isArray) ?? [];

describe("UserService.create", () => {
  it("stores a scrypt hash, never the raw password", async () => {
    const deps = makeDeps();
    await makeService(deps).create({ name: "Rahim", email: "rahim@example.com", password: "correct-horse" } as CreateUserDto);

    const saved = savedUser(deps);
    expect(saved.password).toBeUndefined();
    expect(saved.password_hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(JSON.stringify(deps.saves)).not.toContain("correct-horse");
  });

  it("leaves password_hash null for a phone-only user", async () => {
    const deps = makeDeps();
    await makeService(deps).create({ name: "Karim", phone: "+8801712345678" } as CreateUserDto);

    expect(savedUser(deps).password_hash).toBeNull();
  });

  it("returns the saved row read back through getOne, with its locations", async () => {
    const deps = makeDeps();
    deps.userLocationRepository.getByUserId.mockResolvedValue([{ id: 30, name: "Dhaka" }]);
    const result = await makeService(deps).create({ name: "Rahim", email: "rahim@example.com", password: "correct-horse" } as CreateUserDto);

    expect(deps.userRepository.getOne).toHaveBeenCalledWith(7);
    expect(deps.userLocationRepository.getByUserId).toHaveBeenCalledWith(7);
    expect(result).toEqual({ id: 7, locations: [{ id: 30, name: "Dhaka" }] });
  });

  it("saves the picked locations in the same transaction as the user", async () => {
    const deps = makeDeps();
    await makeService(deps).create({ name: "Rahim", phone: "+8801712345678", location_ids: [30, 2015] } as CreateUserDto);

    expect(deps.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(savedLocations(deps).map((row) => [row.user_id, row.location_id])).toEqual([
      [7, 30],
      [7, 2015],
    ]);
  });

  it("drops a pick another pick already covers", async () => {
    const deps = makeDeps();
    await makeService(deps).create({ name: "Rahim", phone: "+8801712345678", location_ids: [3026, 30] } as CreateUserDto);

    expect(savedLocations(deps).map((row) => row.location_id)).toEqual([30]);
  });

  it("rejects an unknown location id before writing anything", async () => {
    const deps = makeDeps();
    const create = makeService(deps).create({ name: "Rahim", phone: "+8801712345678", location_ids: [30, 999] } as CreateUserDto);

    await expect(create).rejects.toBeInstanceOf(BadRequestException);
    expect(deps.dataSource.transaction).not.toHaveBeenCalled();
  });

  it("writes no location rows when none are picked", async () => {
    const deps = makeDeps();
    await makeService(deps).create({ name: "Karim", phone: "+8801712345678" } as CreateUserDto);

    expect(deps.locationRepository.getByIds).not.toHaveBeenCalled();
    expect(savedLocations(deps)).toEqual([]);
  });

  it("turns a unique-index violation from a lost race into 409", async () => {
    const deps = makeDeps();
    deps.manager.save.mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" }));

    await expect(makeService(deps).create({ name: "Rahim", phone: "+8801712345678" } as CreateUserDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it("rethrows any other database error untouched", async () => {
    const deps = makeDeps();
    const failure = Object.assign(new Error("check violation"), { code: "23514" });
    deps.manager.save.mockRejectedValue(failure);

    await expect(makeService(deps).create({ name: "Rahim", phone: "+8801712345678" } as CreateUserDto)).rejects.toBe(failure);
  });
});
