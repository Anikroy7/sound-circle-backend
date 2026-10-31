/**
 * Every table name in the system, declared once. `@Entity(TABLE_*)` and every migration
 * take the name from here — a literal string in an entity decorator is a defect.
 *
 * Grouped to match the domains in `doc/schema-design.md` §4. Each block fills as its table lands.
 */

/*========IDENTITY AND AUTH (§4.1)=========*/
export const TABLE_USERS: string = "users";
