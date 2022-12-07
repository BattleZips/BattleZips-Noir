use dep::std;

fn check_for_hit(lengths: [u4; 5], ships: [Field; 15], shot: [Field; 2]) -> bool {
    let shot_coord = shot[0] + shot[1] * 10;
    let mut hits = 0;
    for i in 0..5 {
        for j in 0..5 {
            if(lengths[i] > j as u4) {
                let mut coord = 0;
                if ships[i*3+2] == 1 { 
                    coord = ships[i*3] + ships[i*3+1] * 10 + (10 * j);
                } else {
                    coord = ships[i*3] + ships[i*3+1] * 10 + j;
                }
                hits = hits + (coord == shot_coord) as u1;
            }
        };
    };
    hits > 0
}

fn main(hash: pub Field, hit: u1, ships: [Field; 15], shot: pub [Field; 2]) {
   let lengths: [u4; 5] = [5, 4, 3, 3, 2];
   // Ensure shots within board boundaries
   constrain shot[0] as u4 < 10;
   constrain shot[1] as u4 < 10;
   // Ensure computed hash is equal to provided hash
   let computed_hash = std::hash::pedersen(ships);
   constrain hash == computed_hash[0];
   let hits = check_for_hit(lengths, ships, shot);
   constrain hits as u1 == hit;
}