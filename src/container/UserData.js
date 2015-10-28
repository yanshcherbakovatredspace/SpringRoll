/**
 * @module Container Client
 * @namespace springroll
 */
(function()
{
	// Impor classes
	var SavedData = include('springroll.SavedData');
	var Application = include('springroll.Application');

	/**
	 * This class is responsible for saving the user-specific data
	 * within an Application. This can be player-progress data, high
	 * score information, or other data that needs be saved between
	 * sessions of running an app.
	 * @class UserData
	 * @constructor
	 */
	var UserData = function()
	{
		/**
		 * Reference to the container. If the app is not connected
		 * to the Container (running standalone) then the container
		 * is set to be `null`.
		 * @property {Bellhop} container
		 * @default  null
		 * @readOnly
		 */
		this.container = null;

		/**
		 * The name to preprend to each property name, this is set
		 * by default as the Application's name, which is required
		 * for the Container Client module.
		 * @property {String} id
		 * @default ""
		 */
		this.id = "";
	};

	// Reference to prototype
	var p = extend(UserData);

	/**
	 * Read a saved setting
	 * @method read
	 * @param  {String}   prop The property name
	 * @param  {Function} callback Callback when save completes, returns the value
	 */
	p.read = function(prop, callback)
	{
		if (!this.container || !this.container.supported)
		{
			var prefix = Application.instance.options.name || "";
			return callback(SavedData.read(prefix + prop));
		}
		this.container.fetch(
			'userDataRead',
			function(event)
			{
				callback(event.data);
			},
			this.id + prop,
			true // run-once
		);
	};

	/**
	 * Write a setting
	 * @method write
	 * @param  {String}   prop The property name
	 * @param  {*}   value The property value to save
	 * @param  {Function} [callback] Callback when write completes
	 */
	p.write = function(prop, value, callback)
	{
		if (!this.container || !this.container.supported)
		{
			var prefix = Application.instance.options.name || "";
			SavedData.write(prefix + prop, value);
			if (callback) callback();
			return;
		}
		this.container.fetch(
			'userDataWrite',
			function(event)
			{
				if (callback) callback();
			},
			{
				name: this.id + prop,
				value: value
			},
			true // run-once
		);
	};

	/**
	 * Delete a saved setting by name
	 * @method remove
	 * @param  {String}   prop The property name
	 * @param  {Function} [callback] Callback when remove completes
	 */
	p.remove = function(prop, callback)
	{
		if (!this.container || !this.container.supported)
		{
			var prefix = Application.instance.options.name || "";
			SavedData.remove(prefix + prop);
			if (callback) callback();
			return;
		}
		this.container.fetch(
			'userDataRemove',
			function(event)
			{
				if (callback) callback();
			},
			this.id + prop,
			true // run-once
		);
	};

	/**
	 * Destroy and don't use after this
	 * @method destroy
	 */
	p.destroy = function()
	{
		this.container = null;
	};

	// Assign to namespace
	namespace('springroll').UserData = UserData;

}());