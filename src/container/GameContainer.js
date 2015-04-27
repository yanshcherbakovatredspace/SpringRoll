/**
 * @module Container
 * @namespace springroll
 * @requires  Core
 */
(function(document, undefined)
{
	//Import classes
	var SavedData = include('springroll.SavedData'),
		EventDispatcher = include('springroll.EventDispatcher'),
		Features = include('springroll.Features'),
		Bellhop = include('Bellhop'),
		$ = include('jQuery');

	/**
	 * The game container
	 * @class GameContainer
	 * @constructor
	 * @param {string} iframeSelector jQuery selector for game iframe container
	 * @param {object} [options] Optional parameteres
	 * @param {string} [options.helpButton] jQuery selector for help button
	 * @param {string} [options.captionsButton] jQuery selector for captions button
	 * @param {string} [options.soundButton] jQuery selector for captions button
	 * @param {string} [options.voButton] jQuery selector for vo button
	 * @param {string} [options.sfxButton] jQuery selector for sounf effects button
	 * @param {string} [options.musicButton] jQuery selector for music button
	 * @param {string} [options.pauseButton] jQuery selector for pause button
	 */
	var GameContainer = function(iframeSelector, options)
	{
		EventDispatcher.call(this);

		options = options ||
		{};

		/**
		 * The name of this class
		 * @property {string} name
		 */
		this.name = 'springroll.GameContainer';

		/**
		 * The current iframe jquery object
		 * @property {jquery} iframe
		 */
		this.main = $(iframeSelector);

		/**
		 * The DOM object for the iframe
		 * @property {Element} dom
		 */
		this.dom = this.main[0];

		/**
		 * Reference to the help button
		 * @property {jquery} helpButton
		 */
		this.helpButton = $(options.helpButton)
			.click(onPlayHelp.bind(this));

		/**
		 * Reference to the captions button
		 * @property {jquery} captionsButton
		 */
		this.captionsButton = $(options.captionsButton)
			.click(onCaptionsToggle.bind(this));

		/**
		 * Reference to the all sound mute button
		 * @property {jquery} soundButton
		 */
		this.soundButton = $(options.soundButton)
			.click(onSoundToggle.bind(this));

		/**
		 * Reference to the music mute button
		 * @property {jquery} musicButton
		 */
		this.musicButton = $(options.musicButton)
			.click(onMusicToggle.bind(this));

		/**
		 * Reference to the sound effects mute button
		 * @property {jquery} sfxButton
		 */
		this.sfxButton = $(options.sfxButton)
			.click(onSFXToggle.bind(this));

		/**
		 * Reference to the voice-over mute button
		 * @property {jquery} voButton
		 */
		this.voButton = $(options.voButton)
			.click(onVOToggle.bind(this));

		/**
		 * Reference to the pause game button
		 * @property {jquery} pauseButton
		 */
		this.pauseButton = $(options.pauseButton)
			.click(onPauseToggle.bind(this));

		/**
		 * Communication layer between the container and game
		 * @property {Bellhop} messenger
		 */
		this.messenger = null;

		/**
		 * Check to see if a game is loaded
		 * @property {Boolean} loaded
		 * @readOnly
		 */
		this.loaded = false;

		/**
		 * Check to see if a game is loading
		 * @property {Boolean} loading
		 * @readOnly
		 */
		this.loading = false;

		/**
		 * The collection of captions styles
		 * @property {string} _captionsStyles
		 * @private
		 */
		this._captionsStyles = Object.merge(
			{},
			DEFAULT_CAPTIONS_STYLES,
			SavedData.read(CAPTIONS_STYLES) ||
			{}
		);

		/**
		 * Whether the Game is currently "blurred" (not focused) - for pausing/unpausing
		 * @type {Boolean}
		 */
		this._gameBlurred = false;

		/**
		 * Whether the GameContainer is currently "blurred" (not focused) - for pausing/unpausing
		 * @type {Boolean}
		 */
		this._containerBlurred = false;

		/**
		 * Delays pausing of game to mitigate issues with asynchronous communication 
		 * between Game and GameContainer
		 * @type {Timeout}
		 */
		this._pauseTimer = null;

		/**
		 * If the application is currently paused manually
		 * @property {boolean} _isManualPause 
		 * @private
		 * @default false
		 */
		this._isManualPause = false;

		/**
		 * If the current game is paused
		 * @property {Boolean} _paused
		 * @private
		 * @default false
		 */
		this._paused = false;

		//Set the defaults if we have none for the controls
		if (SavedData.read(CAPTIONS_MUTED) === null)
		{
			this.captionsMuted = true;
		}
		if (SavedData.read(SOUND_MUTED) === null)
		{
			this.soundMuted = false;
		}
		
		this._pageVisibility = new springroll.PageVisibility(onContainerFocus.bind(this), onContainerBlur.bind(this));
	};

	//Reference to the prototype
	var s = EventDispatcher.prototype;
	var p = extend(GameContainer, EventDispatcher);

	/**
	 * Fired when the pause state is toggled
	 * @event pause
	 * @param {boolean} paused If the application is now paused
	 */

	/**
	 * Fired when the enabled status of the help button changes
	 * @event helpEnabled
	 * @param {boolean} enabled If the help button is enabled
	 */

	/**
	 * Fired when the application resumes from a paused state
	 * @event resumed
	 */

	/**
	 * Fired when the application becomes paused
	 * @event paused
	 */

	/**
	 * Fired when the application is unsupported
	 * @event unsupported
	 */

	/**
	 * Event when the game gives the load done signal
	 * @event opened
	 */

	/**
	 * Event when a game starts closing
	 * @event close
	 */

	/**
	 * Event when a game closes
	 * @event closed
	 */

	/**
	 * Event when a game start loading
	 * @event open
	 */

	/**
	 * Event when dispatching a progress tracker event
	 * @event progressEvent
	 * @param {object} data The event data
	 */

	/**
	 * Event when dispatching a Google Analytics event
	 * @event trackEvent
	 * @param {object} data The event data
	 * @param {string} data.category The event category
	 * @param {string} data.action The event action
	 * @param {string} [data.label] The optional label
	 * @param {number} [data.value] The optional value
	 */

	/**
	 *  Open a game or path
	 *  @method open
	 *  @param {string} path The full path to the game to load
	 *  @param {Boolean} [singlePlay=false] If the game should be played in single play mode
	 *  @param {object} [playOptions=null] The specific game options for single play mode
	 */
	p.open = function(path, singlePlay, playOptions)
	{
		this.reset();

		// Dispatch event for unsupported browsers
		// and then bail, don't continue with loading the game
		if (!Features.canvas || !(Features.webaudio || Features.flash))
		{
			this.trigger('unsupported');
			return;
		}

		this.loading = true;

		//Setup communication layer between site and game
		this.messenger = new Bellhop();
		this.messenger.connect(this.dom);

		//Handle bellhop events coming from the game
		this.messenger.on(
		{
			trackEvent: onTrackEvent.bind(this),
			progressEvent: onProgressEvent.bind(this),
			loadDone: onLoadDone.bind(this),
			helpEnabled: onHelpEnabled.bind(this),
			endGame: onEndGame.bind(this),
			gameFocus: onGameFocus.bind(this)
		});


		//Open the game in the iframe
		this.main
			.addClass('loading')
			.prop('src', path)
			.prop('width', window.innerWidth)
			.prop('height', window.innerHeight);

		// Play in single play mode
		if (singlePlay)
		{
			this.messenger.send('singlePlay', playOptions);
		}

		this.trigger('open');
	};

	/**
	 * Reset the mutes for audio and captions
	 * @method onLoadDone
	 * @private
	 */
	var onLoadDone = function()
	{
		this.loading = false;
		this.loaded = true;
		this.main.removeClass('loading');

		this.captionsButton.removeClass('disabled');
		this.soundButton.removeClass('disabled');
		this.sfxButton.removeClass('disabled');
		this.voButton.removeClass('disabled');
		this.musicButton.removeClass('disabled');
		this.pauseButton.removeClass('disabled');

		this.captionsMuted = !!SavedData.read(CAPTIONS_MUTED);
		this.soundMuted = !!SavedData.read(SOUND_MUTED);
		this.musicMuted = !!SavedData.read(MUSIC_MUTED);
		this.sfxMuted = !!SavedData.read(SFX_MUTED);
		this.voMuted = !!SavedData.read(VO_MUTED);

		this.setCaptionsStyles(SavedData.read(CAPTIONS_STYLES));

		// Loading is done
		this.trigger('opened');

		// Reset the paused state
		this.paused = this._paused;
	};

	/**
	 * Reset the mutes for audio and captions
	 * @method onHelpEnabled
	 * @private
	 */
	var onHelpEnabled = function(event)
	{
		this.helpEnabled = !!event.data;
	};

	/**
	 * Handle focus events sent from iFrame children
	 * @method onGameFocus
	 * @private
	 */
	var onGameFocus = function(e)
	{
		this._gameBlurred = !e.data;
		manageFocus.call(this);
	};

	/**
	 * Handle focus events sent from container's window
	 * @method onContainerFocus
	 * @private
	 */
	var onContainerFocus = function(e)
	{
		this._containerBlurred = false;
		manageFocus.call(this);
	};

	/**
	 * Handle blur events sent from container's window
	 * @method onContainerBlur
	 * @private
	 */
	var onContainerBlur = function(e)
	{
		//Set both container and game to blurred, 
		//because some blur events are only happening on the container.
		//If container is blurred because game area was just focused,
		//the game's focus event will override the blur imminently.
		this._containerBlurred = this._gameBlurred = true;
		manageFocus.call(this);
	};

	/**
	 * Manage the focus change events sent from window and iFrame
	 * @method manageFocus
	 * @private
	 */
	var manageFocus = function()
	{
		if (this._pauseTimer)//we only need one delayed call, at the end of any sequence of rapidly-fired blur/focus events
			clearTimeout(this._pauseTimer);

		//Delay setting of 'paused' in case we get another focus event soon.
		//Game Focus events are sent to the container asynchronously, and this was
		//causing rapid toggling of the pause state and related issues, 
		//especially in Internet Explorer
		this._pauseTimer = setTimeout(
			function()
			{
				this._pauseTimer = null;
				// A manual pause cannot be overriden by focus events.
				// User must click the resume button.
				if (this._isManualPause === true) return;

				this.paused = this._containerBlurred && this._gameBlurred;
			}.bind(this), 
			100
		);
	};

	/**
	 * The game ended and destroyed itself
	 * @method onEndGame
	 * @private
	 */
	var onEndGame = function()
	{
		this.messenger.destroy();
		this.messenger = null;

		this.reset();
	};

	/**
	 * Track an event for Google Analtyics
	 * @method onTrackEvent
	 * @private
	 * @param {event} event Bellhop trackEvent
	 */
	var onTrackEvent = function(event)
	{
		var data = event.data;

		// PBS Specifc implementation of Google Analytics
		var GoogleAnalytics = include("GA_obj", false);
		if (GoogleAnalytics)
		{
			GoogleAnalytics.trackEvent(
				data.category,
				data.action,
				data.label,
				data.value
			);
		}

		// Generic implementation of Google Analytics
		GoogleAnalytics = include('ga', false);
		if (GoogleAnalytics)
		{
			GoogleAnalytics('send',
			{
				'hitType': 'event',
				'eventCategory': data.category,
				'eventAction': data.action,
				'eventLabel': data.label,
				'eventValue': data.value
			});
		}

		this.trigger('trackEvent', event.data);
	};

	/**
	 * Track an event for springroll ProgressTracker
	 * @method onProgressEvent
	 * @param {event} event The bellhop progressEvent
	 * @private
	 */
	var onProgressEvent = function(event)
	{
		this.trigger('progressEvent', event.data);
	};

	/**
	 * Handler when the play hint button is clicked
	 * @method onPlayHelp
	 * @private
	 */
	var onPlayHelp = function()
	{
		if (!this.paused && !this.helpButton.hasClass('disabled'))
		{
			this.messenger.send('playHelp');
		}
	};

	/**
	 * Handler when the captions mute button is clicked
	 * @method onCaptionsToggle
	 * @private
	 */
	var onCaptionsToggle = function()
	{
		this.captionsMuted = !this.captionsMuted;
	};

	/**
	 * If the current game is paused
	 * @property {Boolean} paused
	 * @default false
	 */
	Object.defineProperty(p, 'paused',
	{
		set: function(paused)
		{
			this._paused = paused;
			if (this.messenger)
			{
				this.messenger.send('pause', paused);
			}
			this.trigger(paused ? 'paused' : 'resumed');
			this.trigger('pause', paused);

			// Set the pause button state
			this.pauseButton.removeClass('unpaused paused')
				.addClass(paused ? 'paused' : 'unpaused');

			// Disable the help button when paused if it's active
			if (paused && !this.helpButton.hasClass('disabled'))
			{
				this.helpButton.data('paused', true);
				this.helpEnabled = false;
			}
			else if (this.helpButton.data('paused'))
			{
				this.helpButton.removeData('paused');
				this.helpEnabled = true;
			}
		},
		get: function()
		{
			return this._paused;
		}
	});

	/**
	 * Handler when the sound mute button is clicked
	 * @method onSoundToggle
	 * @private
	 */
	var onSoundToggle = function()
	{
		var muted = !this.soundMuted;
		this.soundMuted = muted;
		this.musicMuted = muted;
		this.voMuted = muted;
		this.sfxMuted = muted;
	};

	/**
	 * Handler when the music mute button is clicked
	 * @method onMusicToggle
	 * @private
	 */
	var onMusicToggle = function()
	{
		this.musicMuted = !this.musicMuted;
		this._checkSoundMute();
	};

	/**
	 * Handler when the voice-over mute button is clicked
	 * @method onVOToggle
	 * @private
	 */
	var onVOToggle = function()
	{
		this.voMuted = !this.voMuted;
		this._checkSoundMute();
	};

	/**
	 * Handler when the voice-over mute button is clicked
	 * @method onSFXToggle
	 * @private
	 */
	var onSFXToggle = function()
	{
		this.sfxMuted = !this.sfxMuted;
		this._checkSoundMute();
	};

	/**
	 * Check for when all mutes are muted or unmuted
	 * @method _checkSoundMute
	 * @private
	 */
	p._checkSoundMute = function()
	{
		this.soundMuted = this.sfxMuted && this.voMuted && this.musicMuted;
	};

	/**
	 * Toggle the current paused state of the game
	 * @method onPauseToggle
	 * @private
	 */
	var onPauseToggle = function()
	{
		this.paused = !this.paused;
		this._isManualPause = this.paused;
	};

	/**
	 * The name of the saved property if the captions are muted or not
	 * @property {string} CAPTIONS_MUTED
	 * @static
	 * @private
	 * @final
	 */
	var CAPTIONS_MUTED = 'captionsMuted';

	/**
	 * The name of the saved property if the sound is muted or not
	 * @property {string} SOUND_MUTED
	 * @static
	 * @private
	 * @final
	 */
	var SOUND_MUTED = 'soundMuted';

	/**
	 * The name of the saved property if the music is muted or not
	 * @property {string} MUSIC_MUTED
	 * @static
	 * @private
	 * @final
	 */
	var MUSIC_MUTED = 'musicMuted';

	/**
	 * The name of the saved property if the voice-over is muted or not
	 * @property {string} VO_MUTED
	 * @static
	 * @private
	 * @final
	 */
	var VO_MUTED = 'voMuted';

	/**
	 * The name of the saved property if the effects are muted or not
	 * @property {string} SFX_MUTED
	 * @static
	 * @private
	 * @final
	 */
	var SFX_MUTED = 'sfxMuted';

	/**
	 * The name of the saved property for the captions styles
	 * @property {string} CAPTIONS_STYLES
	 * @static
	 * @private
	 * @final
	 */
	var CAPTIONS_STYLES = 'captionsStyles';

	/**
	 * The map of the default caption style settings
	 * @property {object} DEFAULT_CAPTIONS_STYLES
	 * @static
	 * @private
	 * @final
	 */
	var DEFAULT_CAPTIONS_STYLES = {
		size: "md",
		background: "black-semi",
		color: "white",
		edge: "none",
		font: "arial",
		align: "top"
	};

	/**
	 * Abstract method to handle the muting
	 * @method _setMuteProp
	 * @param {string} prop The name of the property to save
	 * @param {jquery} button Reference to the jquery button
	 * @param {boolean} muted  If the button is muted
	 */
	p._setMuteProp = function(prop, button, muted)
	{
		button.removeClass('unmuted muted')
			.addClass(muted ? 'muted' : 'unmuted');

		SavedData.write(prop, muted);
		if (this.messenger)
		{
			this.messenger.send(prop, muted);
		}
	};

	/**
	 * Set the captions styles
	 * @method setCaptionsStyles
	 * @param {object|String} [styles] The style options or the name of the
	 *	property (e.g., "color", "edge", "font", "background", "size")
	 * @param {string} [styles.color='white'] The text color, the default is white
	 * @param {string} [styles.edge='none'] The edge style, default is none
	 * @param {string} [styles.font='arial'] The font style, default is arial
	 * @param {string} [styles.background='black-semi'] The background style, black semi-transparent
	 * @param {string} [styles.size='md'] The font style default is medium
	 * @param {string} [styles.align='top'] The align style default is top of the window
	 * @param {string} [value] If setting styles parameter as a string, this is the value of the property.
	 */
	p.setCaptionsStyles = function(styles, value)
	{
		if (typeof styles === "object")
		{
			Object.merge(
				this._captionsStyles,
				styles ||
				{}
			);
		}
		else if (typeof styles === "string")
		{
			this._captionsStyles[styles] = value;
		}

		styles = this._captionsStyles;

		// Do some validation on the style settings
		if (DEBUG)
		{
			if (!styles.color || !/^(black|white|red|yellow|pink|blue)(-semi)?$/.test(styles.color))
			{
				throw "Setting captions color style is invalid value : " + styles.color;
			}
			if (!styles.background || !/^none|((black|white|red|yellow|pink|blue)(-semi)?)$/.test(styles.background))
			{
				throw "Setting captions background style is invalid value : " + styles.background;
			}
			if (!styles.size || !/^(xs|sm|md|lg|xl)$/.test(styles.size))
			{
				throw "Setting captions size style is invalid value : " + styles.size;
			}
			if (!styles.edge || !/^(raise|depress|uniform|drop|none)$/.test(styles.edge))
			{
				throw "Setting captions edge style is invalid value : " + styles.edge;
			}
			if (!styles.font || !/^(georgia|palatino|times|arial|arial-black|comic-sans|impact|lucida|tahoma|trebuchet|verdana|courier|console)$/.test(styles.font))
			{
				throw "Setting captions font style is invalid value : " + styles.font;
			}
			if (!styles.align || !/^(top|bottom)$/.test(styles.align))
			{
				throw "Setting captions align style is invalid value : " + styles.align;
			}
		}

		SavedData.write(CAPTIONS_STYLES, styles);
		if (this.messenger)
		{
			this.messenger.send(CAPTIONS_STYLES, styles);
		}
	};

	/**
	 * Get the captions styles
	 * @method getCaptionsStyles
	 * @param {string} [prop] The optional property, values are "size", "edge", "font", "background", "color"
	 * @return {object} The collection of styles, see setCaptionsStyles for more info.
	 */
	p.getCaptionsStyles = function(prop)
	{
		var styles = this._captionsStyles;
		return prop ? styles[prop] : styles;
	};

	/**
	 * Reset the captions styles
	 * @method clearCaptionsStyles
	 */
	p.clearCaptionsStyles = function()
	{
		this._captionsStyles = Object.merge(
		{}, DEFAULT_CAPTIONS_STYLES);
		this.setCaptionsStyles();
	};

	/**
	 * Set the captions are enabled or not
	 * @property {boolean} captionsMuted
	 * @default true
	 */
	Object.defineProperty(p, CAPTIONS_MUTED,
	{
		set: function(muted)
		{
			this._captionsMuted = muted;
			this._setMuteProp(CAPTIONS_MUTED, this.captionsButton, muted);
		},
		get: function()
		{
			return this._captionsMuted;
		}
	});

	/**
	 * Set the all sound is enabled or not
	 * @property {boolean} soundMuted
	 * @default false
	 */
	Object.defineProperty(p, SOUND_MUTED,
	{
		set: function(muted)
		{
			this._soundMuted = muted;
			this._setMuteProp(SOUND_MUTED, this.soundButton, muted);
		},
		get: function()
		{
			return this._soundMuted;
		}
	});

	/**
	 * Set the voice-over audio is muted
	 * @property {boolean} voMuted
	 * @default true
	 */
	Object.defineProperty(p, VO_MUTED,
	{
		set: function(muted)
		{
			this._voMuted = muted;
			this._setMuteProp(VO_MUTED, this.voButton, muted);
		},
		get: function()
		{
			return this._voMuted;
		}
	});

	/**
	 * Set the music audio is muted
	 * @property {boolean} musicMuted
	 * @default true
	 */
	Object.defineProperty(p, MUSIC_MUTED,
	{
		set: function(muted)
		{
			this._musicMuted = muted;
			this._setMuteProp(MUSIC_MUTED, this.musicButton, muted);
		},
		get: function()
		{
			return this._musicMuted;
		}
	});

	/**
	 * Set the sound effect audio is muted
	 * @property {boolean} sfxMuted
	 * @default true
	 */
	Object.defineProperty(p, SFX_MUTED,
	{
		set: function(muted)
		{
			this._sfxMuted = muted;
			this._setMuteProp(SFX_MUTED, this.sfxButton, muted);
		},
		get: function()
		{
			return this._sfxMuted;
		}
	});

	/**
	 * Set the captions are muted
	 * @property {Boolean} helpEnabled
	 */
	Object.defineProperty(p, 'helpEnabled',
	{
		set: function(enabled)
		{
			this._helpEnabled = enabled;
			this.helpButton.removeClass('disabled enabled')
				.addClass(enabled ? 'enabled' : 'disabled');

			this.trigger('helpEnabled', enabled);
		},
		get: function()
		{
			return this._helpEnabled;
		}
	});

	/**
	 * Reset all the buttons back to their original setting
	 * and clear the iframe.
	 * @method reset
	 */
	p.reset = function()
	{
		//Disable the hint button
		this.helpEnabled = false;

		disableButton(this.soundButton);
		disableButton(this.captionsButton);
		disableButton(this.musicButton);
		disableButton(this.voButton);
		disableButton(this.sfxButton);
		disableButton(this.pauseButton);

		// Reset state
		this.loaded = false;
		this.loading = false;
		this.paused = false;

		// Clear the iframe src location
		this.main.attr('src', '');

		this.trigger('closed');
	};

	/**
	 * Tell the game to start closing
	 * @method close
	 */
	p.close = function()
	{
		if (this.loading || this.loaded)
		{
			this.trigger('close');
			this.messenger.send('close');
		}
		else
		{
			this.reset();
		}
	};

	/**
	 * Disable a button
	 * @method disableButton
	 * @private
	 * @param {jquery} button The button to disable
	 */
	var disableButton = function(button)
	{
		button.removeClass('enabled')
			.addClass('disabled');
	};

	/**
	 * Destroy and don't use after this
	 * @method destroy
	 */
	p.destroy = function()
	{
		this.reset();

		this.main = null;
		this.dom = null;

		this.soundButton = null;
		this.pauseButton = null;
		this.captionsButton = null;
		this.musicButton = null;
		this.voButton = null;
		this.sfxButton = null;
		
		if(this._pageVisibility)
		{
			this._pageVisibility.destroy();
			this._pageVisibility = null;
		}
		
		if (this.messenger)
		{
			this.messenger.destroy();
			this.messenger = null;
		}

		s.destroy.call(this);
	};

	namespace('springroll').GameContainer = GameContainer;
}(document));