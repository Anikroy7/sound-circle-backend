import * as fs from "fs";
import * as path from "path";
import { EntityManager, Point } from "typeorm";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { LocationLevel, LocationType } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { Seeder } from "@soundcircle/shared/database/seeds/seeder";
import { TABLE_LOCATIONS } from "@soundcircle/shared/utils/util/database.table";

const DATA_DIR = path.join(__dirname, "..", "data", "locations");

/** Divisions (as the districts' parents), districts and upazilas, keyed by BBS geocode. */
export const DISTRICTS_FILE = path.join(DATA_DIR, "all-district.json");
export const UPAZILAS_FILE = path.join(DATA_DIR, "all-upazila.json");

/** City corporations and metropolitan thanas, from the MIT-licensed `bangladesh-geo-data` 4.0.9 (see its README). */
const GEO_DATA_DIR = path.join(DATA_DIR, "bangladesh-geo-data");
export const CITY_CORPORATIONS_FILE = path.join(GEO_DATA_DIR, "city_corporations.json");
export const THANAS_FILE = path.join(GEO_DATA_DIR, "thanas.json");
export const GEO_DATA_DISTRICTS_FILE = path.join(GEO_DATA_DIR, "districts.json");

/** The two sources spell five districts differently; the BBS spelling wins. */
const DISTRICT_ALIASES: Record<string, string> = {
  Bogra: "Bogura",
  "Chapai Nawabganj": "Chapainababganj",
  Jessore: "Jashore",
  Jhalokathi: "Jhalokati",
  Netrokona: "Netrakona",
};

/* The fields this seeder reads. The files carry more (zip codes, wards); none is needed. */
interface GeoName {
  local: string;
  en: string;
}

interface BbsRow {
  id: string;
  name: GeoName;
  parent: { id: string; name: GeoName };
  /** The place's centre, as strings: `{ "lat": "23.88", "lon": "90.281" }`. */
  geo?: { lat: string; lon: string };
}

interface GeoDataDistrict {
  id: string;
  name: string;
}

interface GeoDataCityCorporation {
  id: string;
  name: string;
  nameBn: string;
  districtId: string;
}

interface GeoDataThana {
  id: string;
  name: string;
  nameBn: string;
  type: "rural" | "sub-district" | "metropolitan";
  cityCorpId: string | null;
}

export interface LocationSources {
  districts: BbsRow[];
  upazilas: BbsRow[];
  cityCorporations: GeoDataCityCorporation[];
  thanas: GeoDataThana[];
  geoDataDistricts: GeoDataDistrict[];
}

export type LocationSeedRow = Pick<
  LocationEntity,
  "id" | "parent_id" | "level" | "type" | "name" | "name_bn" | "center_point" | "division_id" | "district_id" | "subdistrict_id"
>;

/** `BD3026` → 3026. The geocode is stable, so the same place keeps the same id in every environment. */
export const geocodeToId = (geocode: string): number => {
  if (!/^BD\d{2,10}$/.test(geocode)) throw new Error(`Unexpected geocode "${geocode}"`);
  return Number(geocode.slice(2));
};

/** Bangladesh, with a margin. A swapped lat/lon lands outside it and fails the seed instead of a search. */
const BANGLADESH = { minLat: 20, maxLat: 27, minLon: 88, maxLon: 93 };

/** A GeoJSON point — longitude FIRST, as GeoJSON orders it. */
export const toPoint = (lat: number, lon: number, label: string): Point => {
  if (!(lat >= BANGLADESH.minLat && lat <= BANGLADESH.maxLat && lon >= BANGLADESH.minLon && lon <= BANGLADESH.maxLon)) {
    throw new Error(`${label}: (${lat}, ${lon}) is not in Bangladesh`);
  }
  return { type: "Point", coordinates: [lon, lat] };
};

const pointOf = (row: BbsRow): Point => (row.geo?.lat && row.geo?.lon ? toPoint(Number(row.geo.lat), Number(row.geo.lon), row.id) : null);

/** `cc-01` → 1, `tha-0133` → 133, checked against the room the id scheme leaves for it. */
const sequenceOf = (sourceId: string, prefix: string, max: number): number => {
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(sourceId);
  const value = match ? Number(match[1]) : NaN;
  if (!(value >= 1 && value <= max)) throw new Error(`Unexpected id "${sourceId}"`);
  return value;
};

/**
 * Every row, parents before children:
 *
 * | Row | Source | `id` |
 * |---|---|---|
 * | division | BBS district file (`parent`) | geocode: Dhaka `BD30` → 30 |
 * | district | BBS district file | geocode: `BD3026` → 3026 |
 * | upazila | BBS upazila file | geocode: Savar `BD30260072` → 30260072 |
 * | city corporation | bangladesh-geo-data | district × 100 + n: Dhaka North `cc-01` → 302601 |
 * | metropolitan thana | bangladesh-geo-data | city corporation × 1000 + n: `tha-0133` → 302601133 |
 *
 * The bands never overlap (6 and 9 digits against the 8-digit upazilas), and all stay under int4's limit.
 * Rural and sub-district thanas are skipped: they duplicate upazilas or sit inside them as police stations.
 *
 * `center_point`: districts and upazilas from the BBS files; a division is the average of its districts'
 * (approximate, but only "near" searches read it); city corporations and thanas have none in their source.
 */
export const buildLocationRows = (sources: LocationSources): LocationSeedRow[] => {
  const divisions = new Map<number, LocationSeedRow>();
  for (const district of sources.districts) {
    const id = geocodeToId(district.parent.id);
    divisions.set(id, {
      id,
      parent_id: null,
      level: LocationLevel.DIVISION,
      type: LocationType.DIVISION,
      name: district.parent.name.en,
      name_bn: district.parent.name.local,
      center_point: null,
      division_id: id,
      district_id: null,
      subdistrict_id: null,
    });
  }

  const districtRows: LocationSeedRow[] = sources.districts.map((district) => {
    const id = geocodeToId(district.id);
    const divisionId = geocodeToId(district.parent.id);
    return {
      id,
      parent_id: divisionId,
      level: LocationLevel.DISTRICT,
      type: LocationType.DISTRICT,
      name: district.name.en,
      name_bn: district.name.local,
      center_point: pointOf(district),
      division_id: divisionId,
      district_id: id,
      subdistrict_id: null,
    };
  });

  for (const division of divisions.values()) {
    const points = districtRows.filter((row) => row.division_id === division.id && row.center_point).map((row) => row.center_point.coordinates);
    if (points.length) {
      const average = (axis: number): number => points.reduce((sum, point) => sum + point[axis], 0) / points.length;
      division.center_point = toPoint(average(1), average(0), division.name);
    }
  }

  const districtById = new Map(districtRows.map((row) => [row.id, row]));
  const districtByName = new Map(districtRows.map((row) => [row.name, row]));

  const subdistrictRow = (
    id: number,
    type: LocationType,
    name: string,
    nameBn: string,
    centerPoint: Point,
    district: LocationSeedRow,
  ): LocationSeedRow => ({
    id,
    parent_id: district.id,
    level: LocationLevel.SUBDISTRICT,
    type,
    name,
    name_bn: nameBn,
    center_point: centerPoint,
    division_id: district.division_id,
    district_id: district.id,
    subdistrict_id: id,
  });

  const upazilaRows: LocationSeedRow[] = sources.upazilas.map((upazila) => {
    const district = districtById.get(geocodeToId(upazila.parent.id));
    if (!district) throw new Error(`Upazila ${upazila.id} names district ${upazila.parent.id}, which is not in the district file`);
    return subdistrictRow(geocodeToId(upazila.id), LocationType.UPAZILA, upazila.name.en, upazila.name.local, pointOf(upazila), district);
  });

  // bangladesh-geo-data has its own district ids; match them to the BBS rows by name.
  const geoDataDistrictName = new Map(sources.geoDataDistricts.map((district) => [district.id, district.name]));
  const bbsDistrictFor = (geoDataDistrictId: string): LocationSeedRow => {
    const name = geoDataDistrictName.get(geoDataDistrictId);
    const district = districtByName.get(DISTRICT_ALIASES[name] ?? name);
    if (!district) throw new Error(`District ${geoDataDistrictId} ("${name}") matches no BBS district; add it to DISTRICT_ALIASES`);
    return district;
  };

  const cityCorporationById = new Map<string, LocationSeedRow>();
  const cityCorporationRows: LocationSeedRow[] = sources.cityCorporations.map((cityCorporation) => {
    const district = bbsDistrictFor(cityCorporation.districtId);
    const id = district.id * 100 + sequenceOf(cityCorporation.id, "cc", 99);
    const row = subdistrictRow(id, LocationType.CITY_CORPORATION, cityCorporation.name, cityCorporation.nameBn, null, district);
    cityCorporationById.set(cityCorporation.id, row);
    return row;
  });

  const thanaRows: LocationSeedRow[] = sources.thanas
    .filter((thana) => thana.type === "metropolitan")
    .map((thana) => {
      const cityCorporation = cityCorporationById.get(thana.cityCorpId);
      if (!cityCorporation)
        throw new Error(`Thana ${thana.id} names city corporation ${thana.cityCorpId}, which is not in the city corporation file`);
      return {
        id: cityCorporation.id * 1000 + sequenceOf(thana.id, "tha", 999),
        parent_id: cityCorporation.id,
        level: LocationLevel.LOCALITY,
        type: LocationType.THANA,
        name: thana.name,
        name_bn: thana.nameBn,
        center_point: null,
        division_id: cityCorporation.division_id,
        district_id: cityCorporation.district_id,
        subdistrict_id: cityCorporation.id,
      };
    });

  return [...divisions.values(), ...districtRows, ...upazilaRows, ...cityCorporationRows, ...thanaRows];
};

const readJson = (file: string): any => JSON.parse(fs.readFileSync(file, "utf8"));

export const readLocationSources = (): LocationSources => ({
  districts: readJson(DISTRICTS_FILE),
  upazilas: readJson(UPAZILAS_FILE),
  cityCorporations: readJson(CITY_CORPORATIONS_FILE),
  thanas: readJson(THANAS_FILE),
  geoDataDistricts: readJson(GEO_DATA_DISTRICTS_FILE),
});

export class LocationSeeder implements Seeder {
  name = TABLE_LOCATIONS;

  async run(manager: EntityManager): Promise<void> {
    const rows = buildLocationRows(readLocationSources());

    // Level by level, so every parent row exists before its children reference it.
    for (const level of [LocationLevel.DIVISION, LocationLevel.DISTRICT, LocationLevel.SUBDISTRICT, LocationLevel.LOCALITY]) {
      await manager.upsert(
        LocationEntity,
        rows.filter((row) => row.level === level),
        { conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
      );
    }

    // ⚠ The ids above were explicit, so the identity sequence never moved. Without this, the
    // next row inserted without an id (an area, added by hand) collides with Barishal (id 10).
    await manager.query(`SELECT setval(pg_get_serial_sequence('${TABLE_LOCATIONS}', 'id'), (SELECT max(id) FROM ${TABLE_LOCATIONS}))`);

    console.log(`  ${rows.length} locations upserted`);
  }
}
