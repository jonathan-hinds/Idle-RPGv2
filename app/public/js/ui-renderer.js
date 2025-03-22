/**
 * UI-Renderer module
 * Serves as an abstraction layer between game logic and visual representation
 * Centralizes common rendering patterns to reduce boilerplate code
 */
const UIRenderer = (function() {
    // Private properties
    const components = new Map();
    const modalInstance = new bootstrap.Modal(document.getElementById('app-modal'));
    
    /**
     * Create DOM element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Element attributes
     * @param {Array|string} children - Child elements or text content
     * @returns {HTMLElement} Created element
     */
    function createElement(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.entries(value).forEach(([prop, val]) => {
                    element.style[prop] = val;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else if (key === 'dangerouslySetInnerHTML' && value.__html) {
                element.innerHTML = value.__html;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add children
        if (typeof children === 'string') {
            element.textContent = children;
        } else if (Array.isArray(children)) {
            children.forEach(child => {
                if (child) {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else {
                        element.appendChild(child);
                    }
                }
            });
        }
        
        return element;
    }
    
    /**
     * Create a card element with flexible structure
     * @param {Object} options - Card configuration options
     * @returns {HTMLElement} Card element
     */
    function createCard(options = {}) {
        const {
            title = '',
            content = '',
            footer = '',
            className = '',
            headerClassName = '',
            bodyClassName = '',
            footerClassName = ''
        } = options;
        
        // Create card parts
        const cardHeader = title ? 
            createElement('div', { className: `card-header ${headerClassName}` }, title) : null;
        
        const cardBody = createElement('div', { 
            className: `card-body ${bodyClassName}` 
        }, content);
        
        const cardFooter = footer ? 
            createElement('div', { className: `card-footer ${footerClassName}` }, footer) : null;
        
        // Assemble card
        return createElement('div', { 
            className: `card ${className}`
        }, [
            cardHeader,
            cardBody,
            cardFooter
        ].filter(Boolean));
    }
    
    /**
     * Create a form group with label and input
     * @param {Object} options - Form group configuration
     * @returns {HTMLElement} Form group element
     */
    function createFormGroup(options = {}) {
        const {
            id,
            label,
            type = 'text',
            value = '',
            placeholder = '',
            required = false,
            className = '',
            labelClassName = '',
            inputClassName = '',
            onChange = null,
            min,
            max,
            step,
            disabled = false
        } = options;
        
        const labelElement = createElement('label', {
            for: id,
            className: `form-label ${labelClassName}`
        }, label);
        
        const inputAttrs = {
            type,
            className: `form-control ${inputClassName}`,
            id,
            name: id,
            value,
            placeholder,
            required,
            disabled
        };
        
        // Add optional attributes
        if (min !== undefined) inputAttrs.min = min;
        if (max !== undefined) inputAttrs.max = max;
        if (step !== undefined) inputAttrs.step = step;
        if (onChange) inputAttrs.onInput = onChange;
        
        const inputElement = createElement('input', inputAttrs);
        
        return createElement('div', {
            className: `mb-3 ${className}`
        }, [labelElement, inputElement]);
    }
    
    /**
     * Create a button with standard styling
     * @param {Object} options - Button configuration
     * @returns {HTMLElement} Button element
     */
    function createButton(options = {}) {
        const {
            text,
            type = 'button',
            variant = 'primary',
            size = '',
            className = '',
            onClick = null,
            disabled = false,
            icon = ''
        } = options;
        
        const buttonContent = [];
        
        if (icon) {
            buttonContent.push(createElement('i', {
                className: `bi bi-${icon} ${text ? 'me-1' : ''}`
            }));
        }
        
        if (text) {
            buttonContent.push(text);
        }
        
        return createElement('button', {
            type,
            className: `btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`,
            onClick,
            disabled
        }, buttonContent);
    }
    
    /**
     * Create a progress bar with label
     * @param {Object} options - Progress bar configuration
     * @returns {HTMLElement} Progress bar element
     */
    function createProgressBar(options = {}) {
        const {
            value = 0,
            max = 100,
            label = '',
            showPercent = true,
            color = 'primary',
            height = '',
            className = ''
        } = options;
        
        const percent = Math.round((value / max) * 100);
        
        const progressBarElement = createElement('div', {
            className: `progress-bar bg-${color}`,
            role: 'progressbar',
            style: { width: `${percent}%` },
            'aria-valuenow': value,
            'aria-valuemin': 0,
            'aria-valuemax': max
        }, showPercent ? `${percent}%` : '');
        
        const progressElement = createElement('div', {
            className: `progress ${className}`,
            style: height ? { height } : {}
        }, [progressBarElement]);
        
        if (label) {
            return createElement('div', {}, [
                createElement('div', { className: 'd-flex justify-content-between mb-1' }, [
                    createElement('span', {}, label),
                    createElement('span', {}, `${value}/${max}`)
                ]),
                progressElement
            ]);
        }
        
        return progressElement;
    }
    
    /**
     * Create a list group with items
     * @param {Object} options - List group configuration
     * @returns {HTMLElement} List group element
     */
    function createListGroup(options = {}) {
        const {
            items = [],
            flush = false,
            numbered = false,
            className = ''
        } = options;
        
        return createElement('div', {
            className: `list-group ${flush ? 'list-group-flush' : ''} ${numbered ? 'list-group-numbered' : ''} ${className}`
        }, items.map(item => {
            const itemAttrs = {
                className: `list-group-item ${item.active ? 'active' : ''} ${item.className || ''}`,
            };
            
            if (item.onClick) {
                itemAttrs.className += ' list-group-item-action';
                itemAttrs.onClick = item.onClick;
            }
            
            if (item.href) {
                return createElement('a', {
                    ...itemAttrs,
                    href: item.href
                }, item.content);
            }
            
            return createElement('div', itemAttrs, item.content);
        }));
    }
    
    /**
     * Create a table with headers and rows
     * @param {Object} options - Table configuration
     * @returns {HTMLElement} Table element
     */
    function createTable(options = {}) {
        const {
            headers = [],
            rows = [],
            striped = true,
            bordered = false,
            hover = true,
            responsive = true,
            className = ''
        } = options;
        
        // Create table headers
        const tableHeaders = headers.map(header => 
            createElement('th', { scope: 'col' }, header)
        );
        
        const tableHead = createElement('thead', {}, [
            createElement('tr', {}, tableHeaders)
        ]);
        
        // Create table rows
        const tableRows = rows.map(row => {
            const cells = row.map((cell, index) => {
                // First cell in each row is a header
                if (index === 0) {
                    return createElement('th', { scope: 'row' }, cell);
                }
                return createElement('td', {}, cell);
            });
            
            return createElement('tr', {}, cells);
        });
        
        const tableBody = createElement('tbody', {}, tableRows);
        
        // Create table
        const tableElement = createElement('table', {
            className: `table ${striped ? 'table-striped' : ''} ${bordered ? 'table-bordered' : ''} ${hover ? 'table-hover' : ''} ${className}`
        }, [tableHead, tableBody]);
        
        // Wrap in responsive div if needed
        if (responsive) {
            return createElement('div', { className: 'table-responsive' }, [tableElement]);
        }
        
        return tableElement;
    }
    
    /**
     * Create a badge with text
     * @param {Object} options - Badge configuration 
     * @returns {HTMLElement} Badge element
     */
    function createBadge(options = {}) {
        const {
            text,
            color = 'primary',
            pill = false,
            className = ''
        } = options;
        
        return createElement('span', {
            className: `badge bg-${color} ${pill ? 'rounded-pill' : ''} ${className}`
        }, text);
    }
    
    /**
     * Create a tab navigation system
     * @param {Object} options - Tab configuration
     * @returns {HTMLElement} Tab container element
     */
    function createTabs(options = {}) {
        const {
            tabs = [],
            activeTab = 0,
            id = 'tabs-' + Date.now(),
            onTabChange = null,
            className = ''
        } = options;
        
        // Create tab navigation
        const tabLinks = tabs.map((tab, index) => {
            const isActive = index === activeTab;
            
            return createElement('li', { className: 'nav-item' }, [
                createElement('a', {
                    className: `nav-link ${isActive ? 'active' : ''}`,
                    id: `${id}-tab-${index}`,
                    'data-bs-toggle': 'tab',
                    'data-bs-target': `#${id}-content-${index}`,
                    role: 'tab',
                    'aria-controls': `${id}-content-${index}`,
                    'aria-selected': isActive,
                    onClick: () => {
                        if (onTabChange) onTabChange(index);
                    }
                }, tab.title)
            ]);
        });
        
        const tabNav = createElement('ul', {
            className: 'nav nav-tabs mb-3',
            role: 'tablist',
            id: `${id}-nav`
        }, tabLinks);
        
        // Create tab content
        const tabPanes = tabs.map((tab, index) => {
            const isActive = index === activeTab;
            
            return createElement('div', {
                className: `tab-pane fade ${isActive ? 'show active' : ''}`,
                id: `${id}-content-${index}`,
                role: 'tabpanel',
                'aria-labelledby': `${id}-tab-${index}`
            }, tab.content);
        });
        
        const tabContent = createElement('div', {
            className: 'tab-content',
            id: `${id}-content`
        }, tabPanes);
        
        // Create tab container
        return createElement('div', {
            className: `tabs-container ${className}`
        }, [tabNav, tabContent]);
    }
    
    /**
     * Create an alert message
     * @param {Object} options - Alert configuration
     * @returns {HTMLElement} Alert element
     */
    function createAlert(options = {}) {
        const {
            message,
            type = 'info',
            dismissible = false,
            className = ''
        } = options;
        
        const alertAttrs = {
            className: `alert alert-${type} ${dismissible ? 'alert-dismissible fade show' : ''} ${className}`,
            role: 'alert'
        };
        
        const children = [message];
        
        if (dismissible) {
            children.push(
                createElement('button', {
                    type: 'button',
                    className: 'btn-close',
                    'data-bs-dismiss': 'alert',
                    'aria-label': 'Close'
                })
            );
        }
        
        return createElement('div', alertAttrs, children);
    }
    
    /**
     * Create a modal and show it
     * @param {Object} options - Modal configuration
     */
    function showModal(options = {}) {
        const {
            title = '',
            content = '',
            buttons = [],
            size = '',
            closeButton = true,
            backdrop = 'static',
            onClose = null
        } = options;
        
        const modal = document.getElementById('app-modal');
        
        // Set modal size
        if (size) {
            modal.querySelector('.modal-dialog').className = `modal-dialog modal-${size}`;
        } else {
            modal.querySelector('.modal-dialog').className = 'modal-dialog';
        }
        
        // Set title
        modal.querySelector('.modal-title').textContent = title;
        
        // Set content
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = '';
        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else {
            modalBody.appendChild(content);
        }
        
        // Set buttons
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = '';
        
        buttons.forEach(button => {
            modalFooter.appendChild(createButton(button));
        });
        
        // Add close button if needed
        if (closeButton) {
            modalFooter.appendChild(createButton({
                text: 'Close',
                variant: 'secondary',
                onClick: () => modalInstance.hide()
            }));
        }
        
        // Set backdrop
        if (backdrop === false) {
            modal.setAttribute('data-bs-backdrop', 'false');
        } else if (backdrop === 'static') {
            modal.setAttribute('data-bs-backdrop', 'static');
        } else {
            modal.removeAttribute('data-bs-backdrop');
        }
        
        // Set close event
        if (onClose) {
            const handleClose = () => {
                onClose();
                modal.removeEventListener('hidden.bs.modal', handleClose);
            };
            
            modal.addEventListener('hidden.bs.modal', handleClose);
        }
        
        // Show modal
        modalInstance.show();
    }
    
    /**
     * Hide current modal
     */
    function hideModal() {
        modalInstance.hide();
    }
    
    /**
     * Display a toast notification
     * @param {Object} options - Toast configuration
     */
    function showToast(options = {}) {
        const {
            title = '',
            message,
            type = 'info',
            duration = 3000
        } = options;
        
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = createElement('div', {
                className: 'toast-container position-fixed bottom-0 end-0 p-3',
                style: { zIndex: 1050 }
            });
            document.body.appendChild(toastContainer);
        }
        
        // Create toast
        const toastId = 'toast-' + Date.now();
        const toast = createElement('div', {
            id: toastId,
            className: `toast align-items-center text-white bg-${type} border-0`,
            role: 'alert',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        }, [
            createElement('div', { className: 'toast-header' }, [
                createElement('strong', { className: 'me-auto' }, title),
                createElement('button', {
                    type: 'button',
                    className: 'btn-close',
                    'data-bs-dismiss': 'toast',
                    'aria-label': 'Close'
                })
            ]),
            createElement('div', { className: 'toast-body' }, message)
        ]);
        
        toastContainer.appendChild(toast);
        
        // Show toast
        const toastInstance = new bootstrap.Toast(toast, { autohide: true, delay: duration });
        toastInstance.show();
        
        // Remove toast when hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    /**
     * Register a component for later use
     * @param {string} name - Component name
     * @param {Function} renderFn - Render function that returns an HTMLElement
     */
    function registerComponent(name, renderFn) {
        components.set(name, renderFn);
    }
    
    /**
     * Render a registered component
     * @param {string} name - Component name
     * @param {Object} props - Component properties
     * @returns {HTMLElement} Rendered component
     */
    function renderComponent(name, props = {}) {
        const renderFn = components.get(name);
        if (!renderFn) {
            console.error(`Component '${name}' not found`);
            return null;
        }
        
        return renderFn(props);
    }
    
    /**
     * Create a resource bar (health, mana, etc.)
     * @param {Object} options - Resource bar configuration
     * @returns {HTMLElement} Resource bar element
     */
    function createResourceBar(options = {}) {
        const {
            current,
            max,
            type = 'health', // 'health', 'mana', 'exp'
            showText = true,
            className = ''
        } = options;
        
        const percent = Math.min(100, Math.max(0, (current / max) * 100));
        const barType = type === 'health' ? 'bg-danger' : 
                        type === 'mana' ? 'bg-primary' : 
                        type === 'exp' ? 'bg-success' : 'bg-secondary';
        
        const resourceText = showText ? `${current}/${max}` : '';
        
        return createElement('div', {
            className: `resource-bar ${type}-bar ${className}`
        }, [
            createElement('div', {
                className: `progress h-100`,
                role: 'progressbar',
                'aria-valuenow': current,
                'aria-valuemin': 0,
                'aria-valuemax': max
            }, [
                createElement('div', {
                    className: `progress-bar ${barType}`,
                    style: { width: `${percent}%` }
                }, resourceText)
            ])
        ]);
    }
    
    /**
     * Create a stat display with label and value
     * @param {Object} options - Stat display configuration
     * @returns {HTMLElement} Stat display element
     */
    function createStatDisplay(options = {}) {
        const {
            label,
            value,
            icon = null,
            className = ''
        } = options;
        
        const statContent = [];
        
        if (icon) {
            statContent.push(createElement('i', {
                className: `bi bi-${icon} me-1`
            }));
        }
        
        statContent.push(createElement('span', {
            className: 'stat-label'
        }, `${label}: `));
        
        statContent.push(createElement('span', {
            className: 'stat-value fw-bold'
        }, value));
        
        return createElement('div', {
            className: `d-flex align-items-center mb-2 ${className}`
        }, statContent);
    }
    
    /**
     * Create an attribute display with controls
     * @param {Object} options - Attribute display configuration
     * @returns {HTMLElement} Attribute display element
     */
    function createAttributeDisplay(options = {}) {
        const {
            label,
            value,
            onIncrease = null,
            onDecrease = null,
            canModify = false,
            className = ''
        } = options;
        
        const labelElement = createElement('div', {
            className: 'col-6 fw-bold'
        }, label);
        
        let valueElement;
        
        if (canModify) {
            valueElement = createElement('div', {
                className: 'col-6 d-flex align-items-center'
            }, [
                createElement('button', {
                    className: 'btn btn-sm btn-outline-secondary',
                    onClick: onDecrease,
                    disabled: !onDecrease
                }, '-'),
                createElement('span', {
                    className: 'attribute-badge mx-2'
                }, value),
                createElement('button', {
                    className: 'btn btn-sm btn-outline-primary',
                    onClick: onIncrease,
                    disabled: !onIncrease
                }, '+')
            ]);
        } else {
            valueElement = createElement('div', {
                className: 'col-6'
            }, [
                createElement('span', {
                    className: 'attribute-badge'
                }, value)
            ]);
        }
        
        return createElement('div', {
            className: `row mb-2 ${className}`
        }, [labelElement, valueElement]);
    }
    
    /**
     * Create an equipment slot display
     * @param {Object} options - Equipment slot configuration
     * @returns {HTMLElement} Equipment slot element
     */
    function createEquipmentSlot(options = {}) {
        const {
            name,
            item = null,
            onUnequip = null,
            className = ''
        } = options;
        
        let content;
        
        if (item) {
            const itemDetails = [];
            
            // Item name
            itemDetails.push(createElement('h5', {
                className: 'mb-2'
            }, item.name));
            
            // Item details
            if (item.type === 'weapon') {
                itemDetails.push(createElement('p', {
                    className: 'mb-1'
                }, `Damage: ${item.minDamage}-${item.maxDamage}`));
                
                if (item.scaling) {
                    const scalingText = Object.entries(item.scaling)
                        .map(([attr, grade]) => `${attr.charAt(0).toUpperCase() + attr.slice(1)}: ${grade}`)
                        .join(', ');
                    
                    itemDetails.push(createElement('p', {
                        className: 'mb-1'
                    }, `Scaling: ${scalingText}`));
                }
            }
            
            // Item bonuses
            if (item.bonuses) {
                const bonusesText = Object.entries(item.bonuses)
                    .map(([stat, value]) => `${stat.charAt(0).toUpperCase() + stat.slice(1)}: +${value}`)
                    .join(', ');
                
                itemDetails.push(createElement('p', {
                    className: 'mb-1'
                }, `Bonuses: ${bonusesText}`));
            }
            
            // Item effects
            if (item.effects && item.effects.length > 0) {
                itemDetails.push(createElement('p', {
                    className: 'mb-1'
                }, `Effects: ${item.effects.join(', ')}`));
            }
            
            // Unequip button
            if (onUnequip) {
                itemDetails.push(createElement('button', {
                    className: 'btn btn-sm btn-danger mt-2',
                    onClick: () => onUnequip(item.id)
                }, 'Unequip'));
            }
            
            content = createElement('div', {
                className: `item-details ${item.type}`
            }, itemDetails);
        } else {
            content = createElement('div', {
                className: 'empty-slot-message'
            }, 'Empty');
        }
        
        return createElement('div', {
            className: `equipment-slot ${className}`
        }, [
            createElement('h4', {
                className: 'slot-name border-bottom pb-2 mb-3'
            }, name),
            content
        ]);
    }
    
    /**
     * Create an item card for inventory or shop
     * @param {Object} options - Item card configuration
     * @returns {HTMLElement} Item card element
     */
    function createItemCard(options = {}) {
        const {
            item,
            actionButton = null,
            className = ''
        } = options;
        
        const cardContent = [];
        
        // Item header with type and slot
        cardContent.push(createElement('div', {
            className: 'mb-2 d-flex justify-content-between'
        }, [
            createElement('span', {
                className: 'fw-bold'
            }, item.name),
            createElement('span', {
                className: 'text-muted'
            }, `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} - ${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}`)
        ]));
        
        // Two-handed indicator for weapons
        if (item.twoHanded) {
            cardContent.push(createElement('div', {
                className: 'mb-2 text-danger'
            }, 'Two-handed'));
        }
        
        // Damage info for weapons
        if (item.type === 'weapon' && item.minDamage !== undefined && item.maxDamage !== undefined) {
            cardContent.push(createElement('div', {
                className: 'mb-2'
            }, `${item.minDamage}-${item.maxDamage} damage`));
        }
        
        // Scaling info for weapons
        if (item.scaling) {
            const scalingDisplay = createElement('div', {
                className: 'mb-2'
            }, [
                createElement('span', {}, 'Scaling: '),
                ...Object.entries(item.scaling).map(([attr, grade]) => 
                    createElement('span', {
                        className: 'me-1'
                    }, `${attr.charAt(0).toUpperCase() + attr.slice(1)}: ${grade}`)
                )
            ]);
            
            cardContent.push(scalingDisplay);
        }
        
        // Stat bonuses
        if (item.bonuses && Object.keys(item.bonuses).length > 0) {
            const bonusList = createElement('ul', {
                className: 'mb-2 ps-3'
            }, Object.entries(item.bonuses).map(([stat, value]) => 
                createElement('li', {}, `${stat.charAt(0).toUpperCase() + stat.slice(1)}: +${value}`)
            ));
            
            cardContent.push(bonusList);
        }
        
        // Effects
        if (item.effects && item.effects.length > 0) {
            const effectsList = createElement('ul', {
                className: 'mb-2 ps-3'
            }, item.effects.map(effect => 
                createElement('li', {}, effect)
            ));
            
            cardContent.push(effectsList);
        }
        
        // Price (for shop)
        if (item.price !== undefined) {
            cardContent.push(createElement('div', {
                className: 'mb-2 fw-bold'
            }, `Price: ${item.price} gold`));
        }
        
        // Action button
        if (actionButton) {
            cardContent.push(actionButton);
        }
        
        return createElement('div', {
            className: `card item-card ${item.type} ${className}`
        }, [
            createElement('div', {
                className: 'card-body'
            }, cardContent)
        ]);
    }
    
    /**
     * Create an ability card for the rotation system
     * @param {Object} options - Ability card configuration
     * @returns {HTMLElement} Ability card element
     */
    function createAbilityCard(options = {}) {
        const {
            ability,
            draggable = false,
            position = null,
            onRemove = null,
            className = ''
        } = options;
        
        const cardContent = [];
        
        // Position badge for rotation
        if (position !== null) {
            cardContent.push(createElement('div', {
                className: 'position-absolute top-0 start-0 bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center',
                style: { width: '24px', height: '24px', margin: '0.5rem' }
            }, position.toString()));
        }
        
        // Ability name
        cardContent.push(createElement('h5', {
            className: 'card-title mb-2'
        }, ability.name));
        
        // Ability type
        cardContent.push(createElement('div', {
            className: 'mb-2'
        }, [
            createElement('span', {
                className: `badge bg-${
                    ability.type === 'physical' ? 'warning' :
                    ability.type === 'magic' ? 'primary' :
                    ability.type === 'heal' ? 'success' :
                    ability.type === 'buff' ? 'success' :
                    ability.type === 'dot' ? 'danger' :
                    'info'
                } me-1`
            }, ability.type.charAt(0).toUpperCase() + ability.type.slice(1)),
            
            // Cooldown
            createElement('span', {
                className: 'text-muted'
            }, `CD: ${ability.cooldown}s`),
            
            // Mana cost if applicable
            ability.manaCost ? createElement('span', {
                className: 'text-primary ms-2'
            }, `Mana: ${ability.manaCost}`) : null
        ].filter(Boolean)));
        
        // Ability description
        cardContent.push(createElement('p', {
            className: 'card-text mb-2'
        }, ability.description));
        
        // Remove button for rotation
        if (onRemove) {
            cardContent.push(createElement('button', {
                className: 'btn btn-sm btn-danger position-absolute bottom-0 end-0 m-2',
                onClick: () => onRemove(ability.id)
            }, '×'));
        }
        
        const card = createElement('div', {
            className: `card ability-card ${ability.type} ${className}`,
            'data-ability-id': ability.id
        }, [
            createElement('div', {
                className: 'card-body'
            }, cardContent)
        ]);
        
        if (draggable) {
            card.setAttribute('draggable', 'true');
        }
        
        return card;
    }
    
    // Public API
    return {
        createElement,
        createCard,
        createFormGroup,
        createButton,
        createProgressBar,
        createListGroup,
        createTable,
        createBadge,
        createTabs,
        createAlert,
        showModal,
        hideModal,
        showToast,
        registerComponent,
        renderComponent,
        createResourceBar,
        createStatDisplay,
        createAttributeDisplay,
        createEquipmentSlot,
        createItemCard,
        createAbilityCard
    };
})();