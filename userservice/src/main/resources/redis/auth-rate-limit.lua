-- First accepted request starts the window; denials never prolong it.
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count >= tonumber(ARGV[1]) then return math.max(1, redis.call('TTL', KEYS[1])) end
local next = redis.call('INCR', KEYS[1])
if next == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
return 0
