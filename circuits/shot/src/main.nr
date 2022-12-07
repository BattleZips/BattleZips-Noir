use dep::std;

fn check_for_hit(lengths: [u4; 5], ships: [Field; 15], shot: [Field; 2]) -> u32 {
    let mut ship_coords: [Field; 25] = [100; 25];
    let shot_coord = shot[0] + shot[1] * 10;
    let mut was_hit = 0;
    for i in 0..5 {
        for j in 0..5 {
            if(lengths[i] > j as u4) {
                let index = i * 5 + j;
                let mut coord = 0;
                if ships[i*3+2] == 1 { 
                    coord = ships[i*3] + ships[i*3+1] * 10 + (10 * j);
                } else {
                    coord = ships[i*3] + ships[i*3+1] * 10 + j;
                }
                ship_coords[index] = coord;
                was_hit = was_hit + has_ship(shot_coord, ship_coords);
            }
        };
    };
    was_hit
}

fn has_ship(coord: Field, ship_coords: [Field; 25]) -> u32 {
    let mut collisions = 0;
    for i in 0..25 {
        if ship_coords[i] == coord {
            collisions = collisions + 1;
        }
    };
    collisions
}

fn main(hash: pub Field, hit: u1, ships: [Field; 15], shot: pub [Field; 2]) {
   let lengths: [u4; 5] = [5, 4, 3, 3, 2];
   // Ensure shots within board boundaries
   constrain shot[0] as u4 < 10;
   constrain shot[1] as u4 < 10;
   // Ensure computed hash is equal to provided hash
   let computed_hash = std::hash::pedersen(ships);
   constrain hash == computed_hash[0];
   constrain check_for_hit(lengths, ships, shot) as bool as u1 == hit;
}