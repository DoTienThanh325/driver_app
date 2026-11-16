-- One hash per identity/policy. Use Redis time to avoid gateway clock skew.
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local window = tonumber(ARGV[3]) * 1000
if window > 0 then
    local count = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
    local expires = tonumber(redis.call('HGET', KEYS[1], 'expires') or '0')
    if expires <= now then count = 0; expires = now + window end
    if count >= rate then return {0, expires - now} end
    redis.call('HSET', KEYS[1], 'count', count + 1, 'expires', expires)
    redis.call('PEXPIRE', KEYS[1], expires - now)
    return {1, 0}
end
local state = redis.call('HMGET', KEYS[1], 'tokens', 'at')
local tokens = tonumber(state[1]) or capacity
local at = tonumber(state[2]) or now
tokens = math.min(capacity, tokens + math.max(0, now - at) * rate / 1000)
local allowed = 0
local wait = math.ceil((1 - tokens) * 1000 / rate)
if tokens >= 1 then allowed = 1; tokens = tokens - 1; wait = 0 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'at', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / rate * 1000) + 1000)
return {allowed, wait}
