import "reflect-metadata";
import { Column, DataSource, Entity, PrimaryColumn } from "typeorm";
import "@soundcircle/shared/utils/util/sort-order.query-builder";

@Entity("sort_order_probe")
class ProbeEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar" })
  name: string;
}

/** Metadata only — no live connection, so this is a true unit test of the generated SQL. */
const queryBuilder = async (): Promise<ReturnType<DataSource["createQueryBuilder"]>> => {
  const dataSource = new DataSource({ type: "postgres", entities: [ProbeEntity], synchronize: false });
  await (dataSource as any).buildMetadatas();
  return dataSource.createQueryBuilder(ProbeEntity, "sort_order_probe").select(["sort_order_probe.id as id", "sort_order_probe.name as name"]);
};

describe("sortOrder", () => {
  it("orders by a selected column's alias", async () => {
    const qb = await queryBuilder();
    qb.sortOrder([{ column_name: "name", dir: "DESC" }]);

    expect(qb.getQuery()).toContain(`ORDER BY "sort_order_probe"."name" DESC`);
  });

  it("defaults to ASC when dir is omitted", async () => {
    const qb = await queryBuilder();
    qb.sortOrder([{ column_name: "id" }]);

    expect(qb.getQuery()).toContain(`ORDER BY "sort_order_probe"."id" ASC`);
  });

  it("accepts a single object as well as an array", async () => {
    const qb = await queryBuilder();
    qb.sortOrder({ column_name: "id", dir: "DESC" });

    expect(qb.getQuery()).toContain("ORDER BY");
  });

  it("does nothing when sort is undefined", async () => {
    const qb = await queryBuilder();
    qb.sortOrder(undefined);

    expect(qb.getQuery()).not.toContain("ORDER BY");
  });

  /**
   * The security property: a column the query never selected can neither inject SQL nor
   * order by something the projection withheld (coding-standards §3).
   */
  it("refuses a column the query did not select", async () => {
    const qb = await queryBuilder();

    expect(() => qb.sortOrder([{ column_name: "id; DROP TABLE sort_order_probe;--" }])).toThrow("Invalid Sort Column");
  });

  it("refuses a real entity column that simply was not projected", async () => {
    const dataSource = new DataSource({ type: "postgres", entities: [ProbeEntity], synchronize: false });
    await (dataSource as any).buildMetadatas();
    const qb = dataSource.createQueryBuilder(ProbeEntity, "sort_order_probe").select(["sort_order_probe.id as id"]); // name withheld

    expect(() => qb.sortOrder([{ column_name: "name" }])).toThrow("Invalid Sort Column");
  });
});
