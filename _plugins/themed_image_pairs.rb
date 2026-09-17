# Validates and renders post header/body dark-image pairs at build time.
#
# Two jobs:
#   1. Validation (check, at :site, :post_read -- runs before Liquid/kramdown
#      render, so doc.content here is still raw Markdown). Enforces:
#        - `image` is required on every post.
#        - `image_dark`, if set, must match `image`'s pixel dimensions.
#        - a body image declaring `{:data-src-dark="..."}` (kramdown's
#          inline-attribute-list syntax) must match ITS pixel dimensions too.
#      Both pair checks share the same logic (check_pair) and the same
#      message shape: name both files and both sizes, since that is the one
#      error an author actually has to act on.
#   2. Rewrite (rewrite, at :documents, :post_render -- runs after kramdown
#      has turned Markdown into HTML). Turns a validated body-image `<img
#      data-src-dark="...">` into the same stacked light/dark markup
#      _includes/ui/themed-image.html renders for the header and the card, so
#      the existing CSS (_tailwind/main.css) and JS
#      (assets/js/themed-image-pairs.js) pick it up unchanged -- both are
#      already page-wide and count-agnostic, keyed off the .themed-image-dark
#      class alone.
#
# The two are split across hooks because the thing each one needs isn't
# available at the same point in the pipeline: validation wants the raw
# source (so it can fail before any rendering happens at all), the rewrite
# needs kramdown to have already produced the <img> tag it's rewriting.
#
# Not a generator either way -- validation only raises, and the rewrite only
# ever replaces markup an author already opted into via an IAL.
#
# Runs on both `jekyll build` and `jekyll serve`, so both checks fire
# locally, not just in CI.
require "fastimage"

module ThemedImagePairs
  # Matches kramdown's inline-attribute-list syntax: an image immediately
  # followed (no space -- kramdown's own rule) by {:...data-src-dark="...".}
  BODY_IMAGE_IAL = /!\[[^\]]*\]\(([^)\s]+)\)\{:[^}]*\bdata-src-dark="([^"]+)"[^}]*\}/.freeze

  # Matches the <img> kramdown renders from that IAL, once it's plain HTML.
  # Attribute order isn't assumed -- each value is pulled out separately below.
  BODY_IMAGE_TAG = %r{<img\s+[^>]*data-src-dark="[^"]*"[^>]*/?>}.freeze

  def self.check(site)
    site.posts.docs.each { |doc| check_doc(site, doc) }
  end

  def self.check_doc(site, doc)
    light = doc.data["image"]
    fail_with(doc, "missing required `image`") if light.nil? || light.to_s.empty?

    light_path = resolve(site, light)
    fail_with(doc, "image not found: #{light}") unless File.file?(light_path)

    # image_dark is optional -- most posts stop here.
    dark = doc.data["image_dark"]
    unless dark.nil? || dark.to_s.empty?
      check_pair(site, doc, light, dark, light_label: "image", dark_label: "image_dark")
    end

    # Body images declare their own pairs inline via a kramdown IAL, e.g.
    # ![alt](light.png){:data-src-dark="dark.png"}. doc.content is still raw
    # Markdown at this hook, so this is a plain regex over source text, not
    # an HTML parse -- kramdown hasn't run yet.
    doc.content.to_s.scan(BODY_IMAGE_IAL).each do |body_light, body_dark|
      check_pair(site, doc, body_light, body_dark, light_label: "image", dark_label: "data-src-dark")
    end
  end

  # Shared by the front-matter image_dark check and every body-image pair:
  # same missing-file / dimension-mismatch checks, same message shape --
  # only the labels (what to call each side in an error) vary.
  def self.check_pair(site, doc, light, dark, light_label:, dark_label:)
    light_path = resolve(site, light)
    dark_path  = resolve(site, dark)
    fail_with(doc, "#{light_label} not found: #{light}") unless File.file?(light_path)
    fail_with(doc, "#{dark_label} not found: #{dark}") unless File.file?(dark_path)

    # FastImage reads only the file header, so this is cheap even for large
    # source images -- no full decode.
    light_size = FastImage.size(light_path)
    dark_size  = FastImage.size(dark_path)
    fail_with(doc, "could not read dimensions of #{light}") if light_size.nil?
    fail_with(doc, "could not read dimensions of #{dark}") if dark_size.nil?

    return if light_size == dark_size

    # Names both files and both sizes -- this is the one error an author
    # actually has to act on, so the message has to be enough to fix it
    # without re-running a separate checker.
    fail_with(doc, <<~MSG)
      #{dark_label} dimensions do not match #{light_label}.
        #{light_label}: #{light} (#{light_size[0]}x#{light_size[1]})
        #{dark_label}: #{dark} (#{dark_size[0]}x#{dark_size[1]})
      The two files are stacked and the dark one is sized to the light one's box,
      so a mismatch renders stretched. Re-export the dark variant at
      #{light_size[0]}x#{light_size[1]}.
    MSG
  end

  # Front-matter/body-image paths are site-absolute ("/assets/images/...");
  # resolve against site.source the same way Jekyll resolves a static file.
  def self.resolve(site, url)
    File.join(site.source, url.to_s.sub(%r{\A/}, ""))
  end

  # FatalException is what Jekyll's own build-breaking errors raise -- it
  # prints the message and exits nonzero, same as a Liquid syntax error would.
  def self.fail_with(doc, message)
    raise Jekyll::Errors::FatalException, "#{doc.relative_path}: #{message}"
  end

  # Rewrites every validated body-image pair into the stacked light/dark
  # markup, once kramdown has already turned the Markdown into doc.output.
  # Only src/alt/data-src-dark survive -- any other IAL attribute on the
  # image (a caption class, an explicit width) is dropped.
  def self.rewrite(doc)
    doc.output = doc.output.gsub(BODY_IMAGE_TAG) do |tag|
      src  = tag[/\bsrc="([^"]*)"/, 1]
      alt  = tag[/\balt="([^"]*)"/, 1] || ""
      dark = tag[/\bdata-src-dark="([^"]*)"/, 1]
      %(<span class="relative block"><img class="block" src="#{src}" alt="#{alt}">) +
        %(<img class="themed-image-dark absolute inset-0 block size-full" src="#{dark}" alt="" aria-hidden="true"></span>)
    end
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  ThemedImagePairs.check(site)
end

Jekyll::Hooks.register :documents, :post_render do |doc|
  next unless doc.collection&.label == "posts"

  ThemedImagePairs.rewrite(doc)
end
