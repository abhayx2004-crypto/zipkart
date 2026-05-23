import redis from 'ioredis';


export function createRedisClient( url : string ) {
    return new redis(url);
}


