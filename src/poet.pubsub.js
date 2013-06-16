var subscriptions = {}

function getSubscribers(key) {
    if (!subscriptions[key]) { subscriptions[key] = [] }
    return subscriptions[key]
}

function subscribe(key, callback) {
    var subscribers = getSubscribers(key)
    for (var i=0; i<=subscribers.length; i++) {
	if (!subscribers[i]) {
	    subscribers[i] = callback
	    callback['poet:pubsub:' + key] = i
	    return
	}
    }
}

function unsubscribe(key, callback) {
    var index       = callback['poet:pubsub:' + key]
    var subscribers = getSubscribers(key)
    subscribers[index] = null
}

function publish(key, data) {
    getSubscribers(key).forEach(function(subscriber) {
	if (subscriber) { subscriber(data) }
    })
}

