const async = require('async');
const db = require('./');
const env = require('../lib/environment');
const mongoose = require('mongoose');
const Badge = require('./badge');
const Schema = mongoose.Schema;
const util = require('../lib/util');

const regex = {
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/
};

const BadgeInstanceSchema = new Schema({
  user: {
    type: String,
    required: true,
    trim: true,
    match: regex.email
  },
  badge: {
    type: String,
    ref: 'Badge'
  },
  assertion: {
    type: String,
    trim: true,
    required: true
  },
  issuedOn: {
    type: Date,
    trim: true,
    required: true,
    default: Date.now
  },
  seen: {
    type: Boolean,
    required: true,
    default: false
  },
  hash: {
    type: String,
    required: true,
  },
  userBadgeKey: {
    type: String,
    required: true,
    unique: true
  },
});
const BadgeInstance = db.model('BadgeInstance', BadgeInstanceSchema);

/**
 * Set the `assertion` by pulling badge by the shortname in the `badge`
 * field and making the assertion with the user from the `user` field.
 *
 * @see Badge#makeAssertion (models/badge.js)
 */

BadgeInstanceSchema.pre('validate', function assertionDefault(next) {
  if (this.assertion) return next();
  Badge.findOne({ shortname: this.badge }, function (err, badge) {
    if (err) return next(err);
    badge.makeAssertion({ recipient: this.user }, function (err, assertion) {
      if (err) return next(err);
      this.assertion = assertion;
      next();
    }.bind(this));
  }.bind(this));
});

/**
 * Set the `hash` field by using `util.hash` to compute the hash for the
 * `assertion` string.
 *
 * @see util.hash (lib/util.js)
 */

BadgeInstanceSchema.pre('validate', function hashDefault(next) {
  if (this.hash) return next();
  this.hash = util.hash(this.assertion);
  return next();
});

/**
 * Set the `userBadgeKey` field to be the concatenation of the `user`
 * and `badge` fields.
 */
BadgeInstanceSchema.pre('validate', function userBadgeKeyDefault(next) {
  if (this.userBadgeKey) return next();
  this.userBadgeKey = this.user + '.' + this.badge;
  return next();
});

/**
 * Check whether a user has a badge.
 *
 * @param {String} user Email address for user
 * @param {String} shortname The badge shortname
 */

BadgeInstance.userHasBadge = function userHasBadge(user, shortname, callback) {
  var query = { userBadgeKey: user + '.' + shortname };
  BadgeInstance.findOne(query, { user: 1 }, function (err, instance) {
    if (err) return callback(err);
    return callback(null, !!instance);
  });
};

/**
 * Get relative URL for a field
 *
 * @param {String} field Should be either `criteria` or `image`
 * @return {String} relative url
 */
BadgeInstance.prototype.relativeUrl = function relativeUrl(field) {
  var formats = {
    assertion: '/badge/assertion/%s',
  };
  return util.format(formats[field], this.hash);
};


/**
 * Get absolute URL for a field
 *
 * @param {String} field Should be either `criteria` or `image`
 * @return {String} absolute url
 */
BadgeInstance.prototype.absoluteUrl = function absoluteUrl(field) {
  return env.qualifyUrl(this.relativeUrl(field));
};

/**
 * Get `issuedOn` in seconds since Unix epoch
 */
BadgeInstance.prototype.issuedOnUnix = function issuedOnUnix() {
  if (!this.issuedOn)
    return 0;
  return (this.issuedOn / 1000) | 0;
};

/**
 * Mark all badges for the user as seen
 *
 * @param {String} email
 */

BadgeInstance.markAllAsSeen = function markAllAsSeen(email, callback) {
  var query = { user: email };
  var update = { seen: true };
  var options = { multi: true };
  BadgeInstance.update(query, update, options, callback);
};
BadgeInstance.markAllAsRead = BadgeInstance.markAllAsSeen;

/**
 * Remove all badge instances assigned to a user
 *
 * @param {String} email
 */

BadgeInstance.deleteAllByUser = function deleteAllByUser(email, callback) {
  function remover(i, callback) { return i.remove(callback) }
  var query = { user: email };
  BadgeInstance.find(query, function (err, instances) {
    if (err) return callback(err);
    async.map(instances, remover, function (err) {
      if (err) return callback(err);
      return callback(null, instances);
    });
  });
};



module.exports = BadgeInstance;
