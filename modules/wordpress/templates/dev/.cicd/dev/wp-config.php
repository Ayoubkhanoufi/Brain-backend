<?php
/***
 *       ___       _               _ _       _ _        _
 *      / _ \_   _| |___  ___   __| (_) __ _(_) |_ __ _| |
 *     / /_)/ | | | / __|/ _ \ / _` | |/ _` | | __/ _` | |
 *    / ___/| |_| | \__ \  __/| (_| | | (_| | | || (_| | |
 *    \/     \__,_|_|___/\___(_)__,_|_|\__, |_|\__\__,_|_|
 *                                     |___/
 * Wordpress Provision File generated <%- new Date().toLocaleString() %>
 * Environments : dev
 */

define('DB_NAME',     '<%- brain.env.dev.db_user %>' );
define('DB_USER',     '<%- brain.env.dev.db_user %>' );
define('DB_PASSWORD', '<%- brain.env.dev.db_password %>' );
define('DB_HOST',     'dev.mysql.pulse.digital' );
define('DB_CHARSET',  'utf8mb4' );
define('DB_COLLATE',  '');

define('WP_MEMORY_LIMIT', '256M');
define('WP_CACHE', false);

define('AUTH_KEY',         '<%- brain.env.dev.key.auth %>' );
define('SECURE_AUTH_KEY',  '<%- brain.env.dev.key.secure_auth %>' );
define('LOGGED_IN_KEY',    '<%- brain.env.dev.key.logged_in %>' );
define('NONCE_KEY',        '<%- brain.env.dev.key.nonce %>' );

define('AUTH_SALT',        '<%- brain.env.dev.salt.auth %>' );
define('SECURE_AUTH_SALT', '<%- brain.env.dev.salt.secure_auth %>' );
define('LOGGED_IN_SALT',   '<%- brain.env.dev.salt.logged_in %>' );
define('NONCE_SALT',       '<%- brain.env.dev.salt.nonce %>' );

$table_prefix = 'wp_';

define('WP_DEBUG', true);
define('WP_DEBUG_LOG', false);

if ( !defined('ABSPATH') ) define('ABSPATH', dirname(__FILE__) . '/');

// disable wordpress autoupdate
define( 'WP_AUTO_UPDATE_CORE', false);

// Change CHMOD attributes
//define('FS_CHMOD_DIR', 755);
//define('FS_CHMOD_FILE', 755);

//Increase Upload Size
@ini_set( 'upload_max_size' , '80M' );
@ini_set( 'post_max_size', '80M');

//increase Maximum Execution Time
set_time_limit(300);

require_once(ABSPATH . 'wp-settings.php');
