/** Shared public/admin ordering; queries alias the rooms table as r. */
export const roomDisplayOrder = `r.capacity asc,
  case when lower(r.name) like '%western%' or lower(r.name) = 'west'
    or lower(r.slug::text) like '%western%' or lower(r.slug::text) = 'west'
    then 0 else 1 end asc,
  r.name asc, r.id asc`;
