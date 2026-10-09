import UIKit
import WebKit
import Capacitor

private final class NavigationMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: RouteManagerViewController?
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.receiveNavigation(message)
    }
}

final class RouteManagerViewController: CAPBridgeViewController {
    private let glassBar = UIVisualEffectView()
    private let tabs = [("today", "Today", "calendar"), ("jobs", "Jobs", "checklist"), ("more", "More", "ellipsis")]
    private var buttons: [UIButton] = []
    private var navigationObservation: NSKeyValueObservation?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView,
              let url = Bundle.main.url(forResource: "native-navigation", withExtension: "js", subdirectory: "public"),
              let source = try? String(contentsOf: url, encoding: .utf8) else { return }
        buildNavigation()
        navigationObservation = webView.observe(\.url, options: [.new]) { [weak self] webView, _ in
            if webView.url?.scheme != "https" || webView.url?.host != "route-manager-phtj.onrender.com" {
                self?.glassBar.isHidden = true
            }
        }
        let handler = NavigationMessageHandler()
        handler.owner = self
        let content = webView.configuration.userContentController
        content.add(handler, name: "routeNavigation")
        content.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
    }

    private func buildNavigation() {
        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect()
            glass.isInteractive = true
            glassBar.effect = glass
        } else {
            glassBar.effect = UIBlurEffect(style: .systemMaterial)
            glassBar.layer.cornerRadius = 32
            glassBar.clipsToBounds = true
        }
        glassBar.isHidden = true
        glassBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(glassBar)
        NSLayoutConstraint.activate([
            glassBar.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            glassBar.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 12),
            glassBar.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -12),
            glassBar.widthAnchor.constraint(lessThanOrEqualToConstant: 440),
            glassBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
            glassBar.heightAnchor.constraint(greaterThanOrEqualToConstant: 66),
        ])
        let width = glassBar.widthAnchor.constraint(equalTo: view.widthAnchor, constant: -24)
        width.priority = .defaultHigh
        width.isActive = true
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        glassBar.contentView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: glassBar.contentView.leadingAnchor, constant: 8),
            stack.trailingAnchor.constraint(equalTo: glassBar.contentView.trailingAnchor, constant: -8),
            stack.topAnchor.constraint(equalTo: glassBar.contentView.topAnchor, constant: 6),
            stack.bottomAnchor.constraint(equalTo: glassBar.contentView.bottomAnchor, constant: -6),
        ])
        for (index, tab) in tabs.enumerated() {
            let button = UIButton(type: .system)
            var config = UIButton.Configuration.plain()
            config.title = tab.1
            config.image = UIImage(systemName: tab.2)
            config.imagePlacement = .top
            config.imagePadding = 3
            config.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(pointSize: 21)
            button.configuration = config
            button.accessibilityIdentifier = "native-nav-\(tab.0)"
            button.tag = index
            button.addTarget(self, action: #selector(activateTab(_:)), for: .touchUpInside)
            stack.addArrangedSubview(button)
            buttons.append(button)
        }
    }

    fileprivate func receiveNavigation(_ message: WKScriptMessage) {
        // Restrict state messages to the trusted website's main frame.
        let origin = message.frameInfo.securityOrigin
        guard message.frameInfo.isMainFrame, origin.protocol == "https",
              origin.host == "route-manager-phtj.onrender.com", [0, 443].contains(origin.port),
              let state = message.body as? [String: Any],
              let visible = state["visible"] as? Bool,
              let selected = state["selected"] as? String,
              tabs.contains(where: { $0.0 == selected }) else { return }
        glassBar.isHidden = !visible
        glassBar.overrideUserInterfaceStyle = (state["dark"] as? Bool == true) ? .dark : .light
        let badge = state["badge"] as? String ?? ""
        let validBadge = badge.range(of: "^[0-9]{1,2}\\+?$", options: .regularExpression) != nil
        for (index, button) in buttons.enumerated() {
            let active = tabs[index].0 == selected
            button.tintColor = active ? .systemBlue : .secondaryLabel
            button.accessibilityTraits = active ? [.button, .selected] : [.button]
            var config = button.configuration
            config?.title = index == 1 && validBadge ? "Jobs (\(badge))" : tabs[index].1
            button.configuration = config
            button.accessibilityLabel = tabs[index].1
            button.accessibilityValue = index == 1 && validBadge ? "\(badge) remaining jobs" : nil
        }
        // Hide the web controls only after native controls have accepted state.
        webView?.evaluateJavaScript("document.documentElement.dataset.nativeNavigation = 'ready'", completionHandler: nil)
    }

    @objc private func activateTab(_ sender: UIButton) {
        guard tabs.indices.contains(sender.tag),
              webView?.url?.scheme == "https", webView?.url?.host == "route-manager-phtj.onrender.com" else { return }
        // Fixed IDs invoke existing React handlers instead of bypassing guards.
        let id = tabs[sender.tag].0
        webView?.evaluateJavaScript("window.__routeNativeNavigation?.activate('\(id)')", completionHandler: nil)
    }
}
