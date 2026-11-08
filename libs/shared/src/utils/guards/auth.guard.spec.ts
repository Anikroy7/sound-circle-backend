import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@soundcircle/shared/utils/guards/auth.guard";
import { CustomRequest } from "@soundcircle/shared/utils/util/utils";

const asUser = (user: any): boolean => CustomRequest.run({ user_agent: "jest", ip_address: "127.0.0.1", user }, () => new AuthGuard().canActivate());

describe("AuthGuard", () => {
  it("lets a signed-in user through", () => {
    expect(asUser({ id: 7 })).toBe(true);
  });

  it("refuses a visitor with 401", () => {
    expect(() => asUser(null)).toThrow(UnauthorizedException);
  });
});
