const ADDON_CLASS = 'ideaboard';
const SHOW_CLASS = 'ideaboard-show';
const PINNED_CLASS = 'ideaboard-pinned';

const STORE = {
  WIDTH: 'ideaboard.sidebar_width'
};

const DEFAULTS = {
  WIDTH: 232
};

const EVENT = {
  TOGGLE: 'ideaboard:toggle',
  TOGGLE_PIN: 'ideaboard:pin',
  LAYOUT_CHANGE: 'ideaboard:layout',
  REQ_START: 'ideaboard:start',
  REQ_END: 'ideaboard:end',
  VIEW_SHOW: 'ideaboard:show',
  SIDEBAR_HTML_INSERTED: 'ideaboard:sidebarHtmlInserted'
};

const GH_CONTAINERS = '.container, .container-lg, .container-responsive';
const GH_HEADER = '.js-header-wrapper > header';
const GH_HIDDEN_RESPONSIVE_CLASS = '.d-none';
const GH_RESPONSIVE_BREAKPOINT = 1010;

$(document).ready(() => {
    async function loadExtension(activationOpts = {}) {
        const $html = $('html');
        const $document = $(document);
        const $sidebar = $document.find('.ideaboard-sidebar');
        const $toggler = $sidebar.find('.ideaboard-toggle');
        const $views = $sidebar.find('.ideaboard-view');
        const $spinner = $sidebar.find('.ideaboard-spin');
        const $pinner = $sidebar.find('.ideaboard-pin');

        $sidebar.resizable({handles: 'e', minWidth: 300, maxWidth: 3000});
  
        $pinner.click(togglePin);
        await setupSidebarFloatingBehaviors();
        if (!$html.hasClass(ADDON_CLASS)) $html.addClass(ADDON_CLASS);
    
        $(window).resize((event) => {
            if (event.target === window) layoutChanged();
        });
    
        $document
            .on(EVENT.REQ_START, () => $spinner.addClass('ideaboard-spin--loading'))
            .on(EVENT.REQ_END, () => $spinner.removeClass('ideaboard-spin--loading'))
            .on(EVENT.LAYOUT_CHANGE, layoutChanged)
            .on(EVENT.TOGGLE_PIN, layoutChanged);
    
        $sidebar
            .addClass('ideaboard-github-sidebar')
            .width(Math.min(parseInt(STORE.WIDTH, 1000)))
            .resize(() => layoutChanged(true))
            .appendTo($('body'));

        $document.trigger(EVENT.SIDEBAR_HTML_INSERTED);
    
        async function toggleSidebar(visibility) {
            if (visibility !== undefined) {
            if (isSidebarVisible() === visibility) return;
                await toggleSidebar();
            } else {
                $html.toggleClass(SHOW_CLASS);
                $document.trigger(EVENT.TOGGLE, isSidebarVisible());
        
                if (isSidebarVisible()) {
                    $toggler.show();
                }
            }
            return visibility;
        }
    
        async function togglePin(isPinned) {
            if (isPinned !== undefined) {
                if (isSidebarPinned() === isPinned) return;
                return togglePin();
            }
    
            $pinner.toggleClass(PINNED_CLASS);
    
            const sidebarPinned = isSidebarPinned();
            $pinner.find('.tooltipped').attr('aria-label', `${sidebarPinned ? 'Unpin' : 'Pin'} this sidebar`);
            $document.trigger(EVENT.TOGGLE_PIN, sidebarPinned);
            await toggleSidebar(sidebarPinned);
            return sidebarPinned;
        }
    
        async function layoutChanged(save = false) {
            const width = $sidebar.outerWidth();
            await updateLayout(isSidebarPinned(), isSidebarVisible(), width);
            if (save === true) {
                STORE.WIDTH = width;
            }
        }

        async function updateLayout(sidebarPinned, sidebarVisible, sidebarWidth) {
            const SPACING = 10;
            const $header = $(GH_HEADER);
            const $containers =
            $('html').width() <= GH_RESPONSIVE_BREAKPOINT
                ? $(GH_CONTAINERS).not(GH_HIDDEN_RESPONSIVE_CLASS)
                : $(GH_CONTAINERS);
        
            const autoMarginLeft = ($(document).width() - $containers.width()) / 2;
            const shouldPushEverything = sidebarPinned && sidebarVisible;
            const smallScreen = autoMarginLeft <= sidebarWidth + SPACING;
        
            $('html').css('margin-left', shouldPushEverything && smallScreen ? sidebarWidth : '');
            $containers.css('margin-left', shouldPushEverything && smallScreen ? SPACING : '');
        
            if (shouldPushEverything && !smallScreen) {
            // Override important in Github Header class in large screen
            $header.attr('style', `padding-left: ${sidebarWidth + SPACING}px !important`);
            } else {
            $header.removeAttr('style');
            }
        }
    
        /**
         * Controls how the sidebar behaves in float mode (i.e. non-pinned).
         */
        async function setupSidebarFloatingBehaviors() {
            const MOUSE_LEAVE_DELAY = 500;
            const KEY_PRESS_DELAY = 4000;
            let isMouseInSidebar = false;
    
            handleHoverOpenOption(true);
    
            // Immediately closes if click outside the sidebar.
            $document.on('click', () => {
            if (!isMouseInSidebar && !isSidebarPinned() && isSidebarVisible()) {
                toggleSidebar(false);
            }
            });
    
            $document.on('mouseover', () => {
            // Ensure startTimer being executed only once when mouse is moving outside the sidebar
            if (!timerId) {
                isMouseInSidebar = false;
                startTimer(MOUSE_LEAVE_DELAY);
            }
            });
    
            let timerId = null;
    
            const startTimer = (delay) => {
            if (!isMouseInSidebar && !isSidebarPinned()) {
                clearTimer();
                timerId = setTimeout(() => toggleSidebar(isSidebarPinned()), delay);
            }
            };
            const clearTimer = () => {
            if (timerId) {
                clearTimeout(timerId);
                timerId = null;
            }
            };
    
            $sidebar
            .on('keyup', () => startTimer(KEY_PRESS_DELAY))
            .on('mouseover', (event) => {
                // Prevent mouseover from propagating to document
                event.stopPropagation();
            })
            .on('focusin mousemove', (event) => {
                // Don't do anything while hovering on Toggler
                const isHoveringToggler = $toggler.is(event.target) || $toggler.has(event.target).length;
    
                if (isHoveringToggler) return;
    
                /**
                 * Use 'focusin' instead of 'mouseenter' to handle the case when clicking a file in the
                 * sidebar then move outside -> 'mouseenter' is triggered in sidebar, clear the timer
                 * and keep sidebar open.
                 */
                isMouseInSidebar = true;
                clearTimer();
    
                if (event.type === 'mousemove' && !isSidebarVisible()) toggleSidebar(true);
            });
        }
    
        function onTogglerHovered() {
            toggleSidebar(true);
        }
    
        function onTogglerClicked(event) {
            event.stopPropagation();
            toggleSidebar(true);
        }
    
        function handleHoverOpenOption(enableHoverOpen) {
            if (enableHoverOpen) {
            $toggler.off('click', onTogglerClicked);
            $toggler.on('mouseenter', onTogglerHovered);
            } else {
            $toggler.off('mouseenter', onTogglerHovered);
            $toggler.on('click', onTogglerClicked);
            }
        }
    
        function isSidebarVisible() {
            return $html.hasClass(SHOW_CLASS);
        }
    
        function isSidebarPinned() {
            return $pinner.hasClass(PINNED_CLASS);
        }
    }
    loadExtension();
  });