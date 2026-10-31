import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";

@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  async healthCheck(): Promise<any> {
    try {
      const queryStr = "SELECT version() AS version";
      const query = await this.dataSource.manager.query(queryStr);

      return ApiResponse(
        {
          status: "ok",
          db_initialized: this.dataSource.isInitialized,
          query_success: Boolean(query?.[0]?.version),
        },
        "Request Successfully",
      );
    } catch (ex) {
      console.error(ex);
      throw new BadRequestException("Internal Error!");
    }
  }
}
