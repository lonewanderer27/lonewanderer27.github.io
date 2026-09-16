# Validates post header images at build time. Not a generator -- it never
# writes anything, only raises to fail the build.
#
# Two rules, enforced on every entry in site.posts:
#   1. `image` is required.
#   2. `image_dark`, if set, must match `image`'s pixel dimensions exactly.
#      The two are rendered stacked (_includes/ui/themed-image.html), with the
#      dark layer sized to the light layer's box, so a mismatch renders
#      stretched -- silently, with nothing in the HTML to show it. That is
#      why this is a build assertion and not a lint warning.
#
# Runs on both `jekyll build` and `jekyll serve` via the :post_read hook, so
# the check fires locally, not just in CI.
require "fastimage"

module ThemedImagePairs
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
    return if dark.nil? || dark.to_s.empty?

    dark_path = resolve(site, dark)
    fail_with(doc, "image_dark not found: #{dark}") unless File.file?(dark_path)

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
      image_dark dimensions do not match image.
        image:      #{light} (#{light_size[0]}x#{light_size[1]})
        image_dark: #{dark} (#{dark_size[0]}x#{dark_size[1]})
      The two files are stacked and the dark one is sized to the light one's box,
      so a mismatch renders stretched. Re-export the dark variant at
      #{light_size[0]}x#{light_size[1]}.
    MSG
  end

  # Front-matter image paths are site-absolute ("/assets/images/..."); resolve
  # against site.source the same way Jekyll resolves a static file.
  def self.resolve(site, url)
    File.join(site.source, url.to_s.sub(%r{\A/}, ""))
  end

  # FatalException is what Jekyll's own build-breaking errors raise -- it
  # prints the message and exits nonzero, same as a Liquid syntax error would.
  def self.fail_with(doc, message)
    raise Jekyll::Errors::FatalException, "#{doc.relative_path}: #{message}"
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  ThemedImagePairs.check(site)
end
